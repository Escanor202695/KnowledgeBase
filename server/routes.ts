import type { Express } from "express";
import express from "express";
import path from "path";
import { createServer, type Server } from "http";
import { Innertube } from 'youtubei.js';
import { promises as fs } from 'fs';
import connectDB from "./lib/mongodb";
import Video from "./lib/models/Video";
import Source from "./lib/models/Source";
import Chunk from "./lib/models/Chunk";
import Conversation from "./lib/models/Conversation";
import UserPreferences from "./lib/models/UserPreferences";
import { extractVideoId, extractPlaylistId, isShortsUrl, isPlaylistUrl, getYoutubeThumbnail } from "./lib/youtube";
import { createChunks, calculateDuration } from "./lib/chunking";
import { generateEmbeddings, chatCompletion, generateEmbedding } from "./lib/openai";
import openai from "./lib/openai";
import { extractDocumentText, generateDocumentTitle } from "./lib/documentProcessor";
import { transcribeAudio, estimateAudioDuration, generateAudioTitle } from "./lib/audioProcessor";
import { uploadDocument, uploadAudio } from "./lib/upload";
import authRoutes from "./routes/auth";
import { requireAuth } from "./middleware/auth";
import { 
  importVideoSchema, 
  importTextSchema, 
  importDocumentSchema,
  importAudioSchema,
  chatSchema 
} from "@shared/schema";

// Initialize YouTube client once at module scope for better performance
let youtubeClient: Innertube | null = null;
async function getYoutubeClient() {
  if (!youtubeClient) {
    youtubeClient = await Innertube.create();
  }
  return youtubeClient;
}

/**
 * Helper function to detect if a message is a question or information request
 * Returns true if the message contains question words, ends with a question mark, or is an information request
 */
function isQuestion(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  
  // Check if ends with question mark
  if (trimmed.endsWith('?')) {
    return true;
  }
  
  // Check for question words at the start
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'will', 'was', 'were'];
  const firstWord = trimmed.split(/\s+/)[0];
  
  if (questionWords.includes(firstWord)) {
    return true;
  }
  
  // Check for information request patterns (imperative questions)
  const infoRequestPatterns = [
    'tell me',
    'explain',
    'describe',
    'show me',
    'give me',
    'help me',
    'find',
    'search',
    'what is',
    'what are',
    'tell us',
    'explain to me',
  ];
  
  for (const pattern of infoRequestPatterns) {
    if (trimmed.startsWith(pattern)) {
      return true;
    }
  }
  
  // Check if message contains question indicators (more than just casual conversation)
  if (trimmed.length > 10) {
    // If message is substantial and not just greetings/small talk, treat as potential question
    const casualGreetings = ['hello', 'hi', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'bye'];
    const words = trimmed.split(/\s+/);
    const isOnlyCasual = words.length <= 3 && casualGreetings.some(g => trimmed.includes(g));
    
    if (!isOnlyCasual) {
      // If it's a substantial message (more than casual), likely an information request
      return true;
    }
  }
  
  return false;
}

/**
 * Helper function to generate a conversation title from the first message
 */
function generateConversationTitle(message: string): string {
  // Take first 50 characters, trim to last complete word
  const maxLength = 50;
  if (message.length <= maxLength) {
    return message.trim();
  }
  
  const truncated = message.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Helper function to import a single YouTube video
 * Returns the source ID if successful, throws error otherwise
 */
async function importSingleVideo(videoId: string): Promise<string> {
  await connectDB();
  
  // Check if video already exists
  const existingSource = await Source.findOne({ youtube_id: videoId });
  if (existingSource) {
    throw new Error("This video has already been added to your knowledge base.");
  }

  console.log(`📝 Fetching video info and transcript for: ${videoId}`);
  let title = `YouTube Video ${videoId}`;
  let videoDurationSeconds = 0;
  let transcript;
  
  const youtube = await getYoutubeClient();
  let videoInfo;
  
  // Try getInfo() first, fallback to getBasicInfo() if parser errors occur
  try {
    videoInfo = await youtube.getInfo(videoId);
  } catch (infoError: any) {
    if (infoError.message?.includes('Type mismatch') || infoError.message?.includes('not found!')) {
      console.log(`  ⚠️ Parser error in getInfo(), trying getBasicInfo()...`);
      videoInfo = await youtube.getBasicInfo(videoId);
    } else {
      throw infoError;
    }
  }
  
  // Extract title using same logic as main endpoint
  let extractedTitle = null;
  
  if (videoInfo.basic_info?.title) {
    const titleValue = videoInfo.basic_info.title;
    if (typeof titleValue === 'string') {
      extractedTitle = titleValue;
    } else if ((titleValue as any)?.text) {
      extractedTitle = (titleValue as any).text;
    } else if ((titleValue as any)?.simpleText) {
      extractedTitle = (titleValue as any).simpleText;
    } else if (Array.isArray((titleValue as any)?.runs) && (titleValue as any).runs.length > 0) {
      extractedTitle = (titleValue as any).runs.map((run: any) => run.text || '').join('');
    }
  } else if ((videoInfo as any).primary_info?.title) {
    const titleValue = (videoInfo as any).primary_info.title;
    if (typeof titleValue === 'string') {
      extractedTitle = titleValue;
    } else if (titleValue?.text) {
      extractedTitle = titleValue.text;
    } else if (titleValue?.simpleText) {
      extractedTitle = titleValue.simpleText;
    } else if (Array.isArray(titleValue?.runs) && titleValue.runs.length > 0) {
      extractedTitle = titleValue.runs.map((run: any) => run.text || '').join('');
    }
  } else if ((videoInfo as any).video?.title) {
    extractedTitle = (videoInfo as any).video.title;
  } else if ((videoInfo as any).video_details?.title) {
    extractedTitle = (videoInfo as any).video_details.title;
  } else if ((videoInfo as any).videoDetails?.title) {
    extractedTitle = (videoInfo as any).videoDetails.title;
  }
  
  if (extractedTitle && typeof extractedTitle === 'string' && extractedTitle.trim().length > 0) {
    title = extractedTitle.trim();
  }

  const durationFromAPI = videoInfo.basic_info?.duration || 0;
  videoDurationSeconds = Math.floor(durationFromAPI / 1000);
  
  // Fetch transcript
  const transcriptData = await videoInfo.getTranscript();
  const segments = transcriptData.transcript?.content?.body?.initial_segments;
  
  if (!segments || segments.length === 0) {
    throw new Error("No transcript available for this video.");
  }
  
  transcript = segments.map((segment: any) => ({
    text: segment.snippet?.text || '',
    offset: segment.start_ms || 0,
    duration: (segment.end_ms || segment.start_ms) - (segment.start_ms || 0)
  }));

  const duration = calculateDuration(transcript) || videoDurationSeconds;
  const thumbnailUrl = getYoutubeThumbnail(videoId);

  // Create source document
  const source = await Source.create({
    source_type: 'youtube',
    title,
    youtube_id: videoId,
    url: `https://youtube.com/watch?v=${videoId}`,
    thumbnail_url: thumbnailUrl,
    duration,
  });

  // Create chunks
  const chunks = createChunks(transcript);
  
  if (chunks.length === 0) {
    await Source.deleteOne({ _id: source._id });
    throw new Error("Failed to process video transcript.");
  }

  // Generate embeddings
  const chunkTexts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddings(chunkTexts);

  // Create chunk documents
  const chunkDocuments = chunks.map((chunk, index) => ({
    source_id: source._id,
    video_id: source._id,
    content: chunk.content,
    embedding: embeddings[index],
    start_time: chunk.start_time,
    chunk_index: chunk.chunk_index,
  }));

  await Chunk.insertMany(chunkDocuments);
  console.log(`✅ Imported video ${videoId}: "${title}" (${chunks.length} chunks)`);
  
  return String(source._id);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));
  
  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
  // Connect to MongoDB (non-blocking to allow app to start)
  connectDB().catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Please check:');
    console.error('1. Your MongoDB URI is correct');
    console.error('2. Your IP address is whitelisted in MongoDB Atlas');
    console.error('3. Your MongoDB Atlas cluster is running');
  });

  // POST /api/import-video - Import and process YouTube video
  app.post("/api/import-video", requireAuth, async (req, res) => {
    try {
      // Ensure MongoDB is connected
      await connectDB();
      
      // Validate request
      const validation = importVideoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: validation.error.errors 
        });
      }

      const { youtubeUrl } = validation.data;

      console.log(`🔍 Processing YouTube URL: ${youtubeUrl}`);

      // Check if this is a playlist URL
      if (isPlaylistUrl(youtubeUrl)) {
        console.log(`  ⚠️ Detected as playlist URL`);
        return res.status(400).json({ 
          error: "This is a playlist URL. Please use the /api/import-playlist endpoint to import playlists." 
        });
      }

      // Extract video ID (supports regular videos and Shorts)
      const videoId = extractVideoId(youtubeUrl);
      console.log(`  📝 Extracted video ID: ${videoId || 'NULL'}`);
      
      if (!videoId) {
        console.log(`  ❌ Failed to extract video ID from URL: ${youtubeUrl}`);
        return res.status(400).json({ 
          error: "Invalid YouTube URL. Please provide a valid YouTube video or Shorts URL." 
        });
      }

      // Check if it's a Shorts URL for logging
      const isShort = isShortsUrl(youtubeUrl);
      if (isShort) {
        console.log(`📹 Detected YouTube Short: ${videoId}`);
      } else {
        console.log(`▶️ Processing as regular video: ${videoId}`);
      }

      // Check if video already exists
      const existingSource = await Source.findOne({ youtube_id: videoId });
      if (existingSource) {
        return res.status(400).json({ 
          error: "This video has already been added to your knowledge base." 
        });
      }

      // Fetch video info and transcript using youtubei.js
      console.log(`📝 Fetching video info and transcript for: ${videoId}`);
      let title = `YouTube Video ${videoId}`;
      let videoDurationSeconds = 0;
      let transcript;
      
      try {
        const youtube = await getYoutubeClient();
        let videoInfo;
        
        // Try getInfo() first, fallback to getBasicInfo() if parser errors occur
        try {
          videoInfo = await youtube.getInfo(videoId);
        } catch (infoError: any) {
          if (infoError.message?.includes('Type mismatch') || infoError.message?.includes('not found!')) {
            console.log(`  ⚠️ Parser error in getInfo(), trying getBasicInfo()...`);
            videoInfo = await youtube.getBasicInfo(videoId);
          } else {
            throw infoError;
          }
        }
        
        // Try multiple sources for the title (in order of preference)
        // youtubei.js structure can vary, so we check multiple possible paths
        let extractedTitle = null;
        
        // Method 1: Try getInfo() response structure - basic_info.title
        // Title might be a string or an object with text/runs property
        if (videoInfo.basic_info?.title) {
          const titleValue = videoInfo.basic_info.title;
          if (typeof titleValue === 'string') {
            extractedTitle = titleValue;
          } else if ((titleValue as any)?.text) {
            extractedTitle = (titleValue as any).text;
          } else if ((titleValue as any)?.simpleText) {
            extractedTitle = (titleValue as any).simpleText;
          } else if (Array.isArray((titleValue as any)?.runs) && (titleValue as any).runs.length > 0) {
            // Extract text from runs array (YouTube's rich text format)
            extractedTitle = (titleValue as any).runs.map((run: any) => run.text || '').join('');
          }
        } 
        // Method 2: Try primary info structure (some API versions)
        else if ((videoInfo as any).primary_info?.title) {
          const titleValue = (videoInfo as any).primary_info.title;
          if (typeof titleValue === 'string') {
            extractedTitle = titleValue;
          } else if (titleValue?.text) {
            extractedTitle = titleValue.text;
          } else if (titleValue?.simpleText) {
            extractedTitle = titleValue.simpleText;
          } else if (Array.isArray(titleValue?.runs) && titleValue.runs.length > 0) {
            extractedTitle = titleValue.runs.map((run: any) => run.text || '').join('');
          }
        }
        // Method 4: Try video object directly
        else if ((videoInfo as any).video?.title) {
          extractedTitle = (videoInfo as any).video.title;
        }
        // Method 5: Try video details structure
        else if ((videoInfo as any).video_details?.title) {
          extractedTitle = (videoInfo as any).video_details.title;
        }
        // Method 6: Try videoDetails (older API structure)
        else if ((videoInfo as any).videoDetails?.title) {
          extractedTitle = (videoInfo as any).videoDetails.title;
        }
        // Method 7: Try microformat structure
        else if ((videoInfo as any).microformat?.playerMicroformatRenderer?.title?.simpleText) {
          extractedTitle = (videoInfo as any).microformat.playerMicroformatRenderer.title.simpleText;
        }
        // Method 8: Try basic_info short_description as fallback (first line)
        else if (videoInfo.basic_info?.short_description) {
          const desc = videoInfo.basic_info.short_description;
          extractedTitle = typeof desc === 'string' ? desc.split('\n')[0].trim() : String(desc);
        }
        // Method 9: Try top-level title property
        else if ((videoInfo as any).title) {
          extractedTitle = (videoInfo as any).title;
        }
        // Method 10: Try getBasicInfo response - it might have a different structure
        else if ((videoInfo as any).page?.microformat?.playerMicroformatRenderer?.title?.simpleText) {
          extractedTitle = (videoInfo as any).page.microformat.playerMicroformatRenderer.title.simpleText;
        }
        
        if (extractedTitle && typeof extractedTitle === 'string' && extractedTitle.trim().length > 0) {
          title = extractedTitle.trim();
          console.log(`  ✅ Retrieved title: "${title}"`);
        } else {
          // Debug: log available properties for troubleshooting
          console.log(`  ⚠️ Could not extract title, debugging structure...`);
          console.log(`  📋 Top-level keys:`, Object.keys(videoInfo || {}));
          if (videoInfo.basic_info) {
            console.log(`  📋 basic_info keys:`, Object.keys(videoInfo.basic_info));
            console.log(`  📋 basic_info content:`, JSON.stringify(videoInfo.basic_info, null, 2).substring(0, 500));
          }
          if ((videoInfo as any).primary_info) {
            console.log(`  📋 primary_info keys:`, Object.keys((videoInfo as any).primary_info));
          }
          console.log(`  ⚠️ Using fallback title: "${title}"`);
        }

        // Use it in your code
        const durationFromAPI = videoInfo.basic_info?.duration || 0;
        videoDurationSeconds = Math.floor(durationFromAPI / 1000);
        const formattedDuration = formatDuration(videoDurationSeconds);
        console.log(`  ✅ Retrieved metadata: "${title}" (${formattedDuration})`);
        
        // Fetch transcript
        console.log(`  📝 Fetching transcript...`);
        const transcriptData = await videoInfo.getTranscript();
        const segments = transcriptData.transcript?.content?.body?.initial_segments;
        
        if (!segments || segments.length === 0) {
          return res.status(400).json({ 
            error: "No transcript available for this video." 
          });
        }
        
        // Convert youtubei.js format to our expected format
        transcript = segments.map((segment: any) => ({
          text: segment.snippet?.text || '',
          offset: segment.start_ms || 0,
          duration: (segment.end_ms || segment.start_ms) - (segment.start_ms || 0)
        }));
        
        console.log(`  ✅ Successfully fetched transcript (${transcript.length} segments)`);
        if (transcript.length > 0) {
          const lastSeg = transcript[transcript.length - 1];
          console.log(`  📊 Last segment - offset: ${lastSeg.offset}ms, duration: ${lastSeg.duration}ms`);
        }
      } catch (error: any) {
        console.error('❌ Failed to fetch video info or transcript:', error.message);
        
        if (error.message?.includes('Transcript is disabled') || error.message?.includes('disabled')) {
          return res.status(400).json({ 
            error: "Captions are disabled for this video." 
          });
        }
        if (error.message?.includes('private') || error.message?.includes('unavailable')) {
          return res.status(400).json({ 
            error: "This video is private or unavailable." 
          });
        }
        return res.status(400).json({ 
          error: `Could not fetch video information. ${error.message || 'The video may not exist or have captions available.'}` 
        });
      }

      // Calculate duration from transcript or use video metadata
      const duration = calculateDuration(transcript) || videoDurationSeconds;
      const thumbnailUrl = getYoutubeThumbnail(videoId);

      // Create source document for YouTube video
      const source = await Source.create({
        source_type: 'youtube',
        title,
        youtube_id: videoId,
        url: `https://youtube.com/watch?v=${videoId}`,
        thumbnail_url: thumbnailUrl,
        duration,
      });

      // Create chunks
      const chunks = createChunks(transcript);
      
      if (chunks.length === 0) {
        await Source.deleteOne({ _id: source._id });
        return res.status(400).json({ 
          error: "Failed to process video transcript." 
        });
      }

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map(c => c.content);
      console.log(`  🔢 Generating embeddings for ${chunkTexts.length} chunks...`);
      const embeddings = await generateEmbeddings(chunkTexts);
      console.log(`  ✅ Generated ${embeddings.length} embeddings (dimension: ${embeddings[0]?.length || 0})`);

      // Create chunk documents
      const chunkDocuments = chunks.map((chunk, index) => ({
        source_id: source._id,
        video_id: source._id, // For backwards compatibility
        content: chunk.content,
        embedding: embeddings[index],
        start_time: chunk.start_time,
        chunk_index: chunk.chunk_index,
      }));

      console.log(`  💾 Storing ${chunkDocuments.length} chunks in MongoDB...`);
      const insertResult = await Chunk.insertMany(chunkDocuments);
      console.log(`  ✅ Stored ${insertResult.length} chunks successfully`);

      console.log(`✅ Imported video ${videoId} with ${chunks.length} chunks`);

      return res.json({ 
        success: true, 
        sourceId: String(source._id)
      });
    } catch (error: any) {
      console.error('Import video error:', error);
      return res.status(500).json({ 
        error: error.message || "Failed to import video. Please try again." 
      });
    }
  });

  // POST /api/import-playlist - Import all videos from a YouTube playlist
  app.post("/api/import-playlist", requireAuth, async (req, res) => {
    try {
      await connectDB();
      
      const validation = importVideoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: validation.error.errors 
        });
      }

      const { youtubeUrl } = validation.data;

      // Extract playlist ID
      const playlistId = extractPlaylistId(youtubeUrl);
      if (!playlistId) {
        return res.status(400).json({ 
          error: "Invalid playlist URL. Please provide a valid YouTube playlist URL." 
        });
      }

      console.log(`📋 Fetching playlist info for: ${playlistId}`);
      const youtube = await getYoutubeClient();
      
      // Get playlist information
      let playlist;
      try {
        playlist = await youtube.getPlaylist(playlistId);
      } catch (error: any) {
        console.error('❌ Failed to fetch playlist:', error.message);
        return res.status(400).json({ 
          error: `Could not fetch playlist. ${error.message || 'The playlist may be private or unavailable.'}` 
        });
      }

      // Get playlist title
      let playlistTitle = 'Untitled Playlist';
      try {
        const titleValue = (playlist as any).header?.playlist_header_renderer?.title?.text || 
                          (playlist as any).title ||
                          (playlist as any).header?.playlist_header_renderer?.title?.simpleText;
        if (titleValue) {
          playlistTitle = typeof titleValue === 'string' ? titleValue : titleValue.text || titleValue;
        }
      } catch (e) {
        console.log('⚠️ Could not extract playlist title');
      }

      console.log(`📋 Playlist: "${playlistTitle}"`);

      // Get all videos from playlist
      const videos: any[] = [];
      try {
        // Iterate through playlist items
        // youtubei.js playlist.videos is an async iterable
        for await (const video of playlist.videos) {
          // Extract video ID from various possible structures
          const videoId = video?.id || 
                        (video as any)?.video_id || 
                        (video as any)?.videoId ||
                        (video as any)?.videoRenderer?.videoId ||
                        (video as any)?.compactVideoRenderer?.videoId ||
                        (video as any)?.playlistVideoRenderer?.videoId;
          
          if (videoId) {
            videos.push({ ...video, extractedId: videoId });
          } else {
            console.log('⚠️ Skipping video with no ID:', Object.keys(video || {}));
          }
        }
      } catch (error: any) {
        console.error('❌ Error iterating playlist videos:', error.message);
        return res.status(400).json({ 
          error: `Could not fetch videos from playlist. ${error.message || ''}` 
        });
      }

      if (videos.length === 0) {
        return res.status(400).json({ 
          error: "This playlist contains no videos or all videos are unavailable." 
        });
      }

      console.log(`📹 Found ${videos.length} videos in playlist`);

      // Import each video (skip ones that already exist)
      const results = {
        total: videos.length,
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        // Use extractedId if available, otherwise try to extract
        const videoId = (video as any).extractedId || 
                       video.id || 
                       (video as any).video_id || 
                       (video as any).videoId || 
                       ((video as any).videoRenderer?.videoId) ||
                       ((video as any).compactVideoRenderer?.videoId) ||
                       ((video as any).playlistVideoRenderer?.videoId);
        
        if (!videoId) {
          results.failed++;
          results.errors.push(`Video ${i + 1}: No video ID found`);
          console.log(`  ❌ [${i + 1}/${videos.length}] Could not extract video ID from:`, Object.keys(video || {}));
          continue;
        }

        try {
          await importSingleVideo(videoId);
          results.imported++;
          console.log(`  ✅ [${i + 1}/${videos.length}] Imported: ${videoId}`);
        } catch (error: any) {
          if (error.message?.includes('already been added')) {
            results.skipped++;
            console.log(`  ⏭️  [${i + 1}/${videos.length}] Skipped (already exists): ${videoId}`);
          } else {
            results.failed++;
            const errorMsg = error.message || 'Unknown error';
            results.errors.push(`Video ${i + 1} (${videoId}): ${errorMsg}`);
            console.log(`  ❌ [${i + 1}/${videos.length}] Failed: ${videoId} - ${errorMsg}`);
          }
        }
      }

      console.log(`✅ Playlist import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`);

      return res.json({ 
        success: true,
        playlistTitle,
        results: {
          total: results.total,
          imported: results.imported,
          skipped: results.skipped,
          failed: results.failed,
          errors: results.errors.length > 0 ? results.errors : undefined,
        }
      });
    } catch (error: any) {
      console.error('Import playlist error:', error);
      return res.status(500).json({ 
        error: error.message || "Failed to import playlist. Please try again." 
      });
    }
  });

  // POST /api/import-text - Import direct text/article
  app.post("/api/import-text", requireAuth, async (req, res) => {
    try {
      await connectDB();
      
      const validation = importTextSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: validation.error.errors 
        });
      }

      const { title, content, author, url } = validation.data;

      console.log(`📄 Importing text: "${title}"`);

      // Create source document
      const source = await Source.create({
        source_type: 'text',
        title,
        content,
        author,
        url: url || undefined,
      });

      // Create chunks from the text content
      const textTranscript = [{ text: content, offset: 0, duration: 0 }];
      const chunks = createChunks(textTranscript);
      
      if (chunks.length === 0) {
        await Source.deleteOne({ _id: source._id });
        return res.status(400).json({ 
          error: "Failed to process text content." 
        });
      }

      // Generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      console.log(`  🔢 Generating embeddings for ${chunkTexts.length} chunks...`);
      const embeddings = await generateEmbeddings(chunkTexts);

      // Create chunk documents
      const chunkDocuments = chunks.map((chunk, index) => ({
        source_id: source._id,
        video_id: source._id, // For backwards compatibility
        content: chunk.content,
        embedding: embeddings[index],
        start_time: chunk.start_time,
        chunk_index: chunk.chunk_index,
      }));

      await Chunk.insertMany(chunkDocuments);

      console.log(`✅ Imported text with ${chunks.length} chunks`);

      return res.json({ 
        success: true, 
        sourceId: String(source._id)
      });
    } catch (error: any) {
      console.error('Import text error:', error);
      return res.status(500).json({ 
        error: error.message || "Failed to import text. Please try again." 
      });
    }
  });

  // POST /api/import-document - Import PDF/DOCX/TXT file
  app.post("/api/import-document", requireAuth, uploadDocument.single('file'), async (req, res) => {
    try {
      await connectDB();

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title: customTitle, author } = req.body;
      const file = req.file;

      console.log(`📄 Processing document: ${file.originalname}`);

      // Extract text from document
      let extractedText: string;
      try {
        extractedText = await extractDocumentText(file.path, file.mimetype);
      } catch (error: any) {
        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ 
          error: `Failed to extract text from document: ${error.message}` 
        });
      }

      if (extractedText.length < 10) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ 
          error: "Document appears to be empty or could not be read" 
        });
      }

      // Generate title if not provided - use AI for better titles
      let title = customTitle;
      if (!title) {
        try {
          // Use AI to generate a descriptive title from content
          const preview = extractedText.substring(0, 1000);
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
              role: "system",
              content: "You are a helpful assistant that generates concise, descriptive titles for documents based on their content. Generate a title in 3-8 words that captures the main topic."
            }, {
              role: "user",
              content: `Generate a title for this document:\n\n${preview}`
            }],
            max_tokens: 50,
            temperature: 0.7,
          });
          title = completion.choices[0]?.message?.content?.trim() || generateDocumentTitle(extractedText, file.originalname);
        } catch (error) {
          console.warn('Failed to generate AI title, using fallback:', error);
          title = generateDocumentTitle(extractedText, file.originalname);
        }
      }

      // Create source document
      const source = await Source.create({
        source_type: 'document',
        title,
        content: extractedText,
        file_url: file.path,
        file_type: file.mimetype,
        author,
      });

      const DEBUG = process.env.NODE_ENV === 'development';
      if (DEBUG) console.log(`  📝 Extracted ${extractedText.length} characters of text`);

      // Create chunks
      const textTranscript = [{ text: extractedText, offset: 0, duration: 0 }];
      const chunks = createChunks(textTranscript);

      // Generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      console.log(`  🔢 Generating embeddings for ${chunkTexts.length} chunks...`);
      const embeddings = await generateEmbeddings(chunkTexts);
      if (DEBUG) console.log(`  ✅ Generated ${embeddings.length} embeddings (dimension: ${embeddings[0]?.length || 0})`);

      // Create chunk documents
      const chunkDocuments = chunks.map((chunk, index) => ({
        source_id: source._id,
        video_id: source._id,
        content: chunk.content,
        embedding: embeddings[index],
        start_time: chunk.start_time,
        chunk_index: chunk.chunk_index,
      }));

      const insertResult = await Chunk.insertMany(chunkDocuments);
      if (DEBUG) console.log(`  💾 Saved ${insertResult.length} chunks to database`);
      
      // Verify chunks were saved with embeddings (dev only)
      if (DEBUG) {
        const savedChunk = await Chunk.findOne({ source_id: source._id });
        if (savedChunk) {
          console.log(`  🔍 Verification - First chunk has embedding: ${savedChunk.embedding ? `YES (${savedChunk.embedding.length}D)` : 'NO'}`);
        }
      }

      console.log(`✅ Imported document "${title}" with ${chunks.length} chunks`);

      return res.json({ 
        success: true, 
        sourceId: String(source._id)
      });
    } catch (error: any) {
      console.error('Import document error:', error);
      // Clean up file if it exists
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(500).json({ 
        error: error.message || "Failed to import document. Please try again." 
      });
    }
  });

  // POST /api/import-audio - Import and transcribe audio file
  app.post("/api/import-audio", requireAuth, uploadAudio.single('file'), async (req, res) => {
    try {
      await connectDB();

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { title: customTitle, author } = req.body;
      const file = req.file;

      console.log(`🎤 Processing audio: ${file.originalname}`);

      // Transcribe audio using Whisper
      let transcription: string;
      try {
        transcription = await transcribeAudio(file.path);
      } catch (error: any) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ 
          error: `Failed to transcribe audio: ${error.message}` 
        });
      }

      if (transcription.length < 10) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ 
          error: "Audio transcription appears to be empty" 
        });
      }

      // Generate title if not provided - use AI for better titles
      let title = customTitle;
      if (!title && transcription) {
        try {
          // Use AI to generate a descriptive title from transcription
          const preview = transcription.substring(0, 1000);
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
              role: "system",
              content: "You are a helpful assistant that generates concise, descriptive titles for audio recordings based on their transcription. Generate a title in 3-8 words that captures the main topic."
            }, {
              role: "user",
              content: `Generate a title for this audio recording:\n\n${preview}`
            }],
            max_tokens: 50,
            temperature: 0.7,
          });
          title = completion.choices[0]?.message?.content?.trim() || file.originalname.replace(/\.[^/.]+$/, '');
        } catch (error) {
          console.warn('Failed to generate AI title for audio, using fallback:', error);
          title = file.originalname.replace(/\.[^/.]+$/, '');
        }
      } else if (!title) {
        title = file.originalname.replace(/\.[^/.]+$/, '');
      }
      const duration = estimateAudioDuration(file.size);

      // Create source document
      const source = await Source.create({
        source_type: 'audio',
        title,
        content: transcription,
        file_url: file.path,
        file_type: file.mimetype,
        duration,
        author,
      });

      // Create chunks
      const textTranscript = [{ text: transcription, offset: 0, duration: 0 }];
      const chunks = createChunks(textTranscript);

      // Generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      console.log(`  🔢 Generating embeddings for ${chunkTexts.length} chunks...`);
      const embeddings = await generateEmbeddings(chunkTexts);

      // Create chunk documents
      const chunkDocuments = chunks.map((chunk, index) => ({
        source_id: source._id,
        video_id: source._id,
        content: chunk.content,
        embedding: embeddings[index],
        start_time: chunk.start_time,
        chunk_index: chunk.chunk_index,
      }));

      await Chunk.insertMany(chunkDocuments);

      console.log(`✅ Imported audio "${title}" with ${chunks.length} chunks`);

      return res.json({ 
        success: true, 
        sourceId: String(source._id)
      });
    } catch (error: any) {
      console.error('Import audio error:', error);
      // Clean up file if it exists
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(500).json({ 
        error: error.message || "Failed to import audio. Please try again." 
      });
    }
  });

  // POST /api/chat - Chat with RAG using vector search
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      // Ensure MongoDB is connected
      await connectDB();
      
      // Validate request
      const validation = chatSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request",
          details: validation.error.errors 
        });
      }

      const { message, conversationId } = validation.data;
      const userId = req.user!.id;

      console.log(`💬 Chat message: "${message}"${conversationId ? ` (conversation: ${conversationId})` : ' (new conversation)'}`);
      
      // Load or create conversation
      let conversation = null;
      if (conversationId) {
        conversation = await Conversation.findOne({ _id: conversationId, userId });
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
      }

      // Load user preferences
      const preferences = await UserPreferences.findOne({ userId }) || {
        temperature: 0.7,
        maxTokens: 8192,
        model: 'gpt-3.5-turbo',
        defaultSystemPrompt: undefined,
      } as any;

      // Determine if this is a question that requires source search
      const shouldSearchSources = isQuestion(message);
      let results: any[] = [];
      let sources: any[] = [];

      if (shouldSearchSources) {
        console.log(`  ❓ Detected question - searching for sources...`);
        
        // Diagnostic: Check if any chunks exist
        const totalChunks = await Chunk.countDocuments();
        console.log(`  📊 Total chunks in database: ${totalChunks}`);
        
        if (totalChunks === 0) {
          const response = {
            answer: "I couldn't find any videos in your knowledge base. Please import some YouTube videos first!",
            sources: [],
            conversationId: conversation?._id.toString() || null,
          };
          
          // Save message to conversation if exists
          if (conversation) {
            conversation.messages.push({
              role: 'user',
              content: message,
              timestamp: new Date(),
            });
            conversation.messages.push({
              role: 'assistant',
              content: response.answer,
              timestamp: new Date(),
            });
            conversation.lastMessageAt = new Date();
            await conversation.save();
          }
          
          return res.json(response);
        }
        
        // Generate embedding for the question
        console.log(`  🔢 Generating embedding for question...`);
        const questionEmbedding = await generateEmbedding(message);
        console.log(`  ✅ Generated query embedding (dimension: ${questionEmbedding.length})`);

        // Perform vector search using MongoDB Atlas Vector Search
        console.log(`  🔍 Searching vector index for relevant chunks...`);
        try {
          results = await Chunk.aggregate([
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: questionEmbedding,
              numCandidates: 50,
              limit: 8,
            },
          },
        {
          $addFields: {
            score: { $meta: "vectorSearchScore" }
          }
        },
        {
          $match: {
            score: { $gte: 0.65 }  // Similarity threshold - balanced between precision and recall
          }
        },
        // Try to lookup from sources collection first (new unified model)
        {
          $lookup: {
            from: "sources",
            localField: "source_id",
            foreignField: "_id",
            as: "source",
          },
        },
        // Also lookup from videos collection for backwards compatibility
        {
          $lookup: {
            from: "videos",
            localField: "video_id",
            foreignField: "_id",
            as: "video",
          },
        },
        // Use source if available, otherwise fall back to video
        {
          $addFields: {
            sourceData: {
              $cond: {
                if: { $gt: [{ $size: "$source" }, 0] },
                then: { $arrayElemAt: ["$source", 0] },
                else: { $arrayElemAt: ["$video", 0] }
              }
            }
          }
        },
        // Filter out chunks that don't have either source or video
        {
          $match: {
            sourceData: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            content: 1,
            start_time: 1,
            score: 1,
            source_type: { $ifNull: ["$sourceData.source_type", "youtube"] },
            video_id: "$sourceData._id",
            video_title: "$sourceData.title",
            video_youtube_id: "$sourceData.youtube_id",
            video_channel: { $ifNull: ["$sourceData.author", "$sourceData.channel_name"] },
            video_thumbnail: "$sourceData.thumbnail_url",
            source_url: "$sourceData.url",
          },
        },
        ]);
      } catch (vectorError: any) {
        console.error('❌ Vector search error:', vectorError.message);
        
        // Check if it's an index error
        if (vectorError.message?.includes('vector_index') || 
            vectorError.message?.includes('index') || 
            vectorError.message?.includes('$vectorSearch')) {
          console.error('⚠️  VECTOR INDEX MISSING! Please create it in MongoDB Atlas:');
          console.error('   1. Go to MongoDB Atlas → Database → Browse Collections');
          console.error('   2. Click "Search Indexes" tab → "Create Search Index"');
          console.error('   3. Use JSON Editor, database: second-brain, collection: chunks');
          console.error('   4. Index name: vector_index');
          console.error('   5. See replit.md for the full JSON configuration');
          
          return res.status(500).json({
            error: "❌ Vector search index 'vector_index' is not set up in MongoDB Atlas. Please create it following the instructions in replit.md. This is required for the AI chat to work.",
          });
        }
        
        throw vectorError;
      }

          console.log(`  ✅ Vector search returned ${results.length} results`);
          if (results.length > 0) {
            console.log(`  📊 Top result score: ${results[0].score?.toFixed(4) || 'N/A'}`);
            console.log(`  📊 Lowest result score: ${results[results.length - 1].score?.toFixed(4) || 'N/A'}`);
          }

          // If no results found
          if (results.length === 0) {
            const response = {
              answer: "I couldn't find any relevant information in your knowledge base to answer that question. Try importing more videos or asking about topics covered in your existing videos.",
              sources: [],
              conversationId: conversation?._id.toString() || null,
            };
            
            // Save message to conversation if exists
            if (conversation) {
              conversation.messages.push({
                role: 'user',
                content: message,
                timestamp: new Date(),
              });
              conversation.messages.push({
                role: 'assistant',
                content: response.answer,
                timestamp: new Date(),
              });
              conversation.lastMessageAt = new Date();
              await conversation.save();
            }
            
            return res.json(response);
          }

          // Build context from top chunks with source type awareness
          const context = results
            .map((r, i) => {
              const sourceLabel = r.source_type === 'youtube' 
                ? `${r.video_title} (Video)`
                : r.source_type === 'text'
                ? `${r.video_title} (Article)`
                : r.source_type === 'document'
                ? `${r.video_title} (Document)`
                : r.source_type === 'audio'
                ? `${r.video_title} (Audio)`
                : r.video_title;
              
              return `[${sourceLabel}${r.video_channel ? ' by ' + r.video_channel : ''}]\n${r.content}`;
            })
            .join('\n\n---\n\n');

          // Format top 3 sources as proper SourceCitation objects
          sources = results.slice(0, 3).map(r => ({
            source_id: r.video_id.toString(),
            source_type: r.source_type || 'youtube',
            source_title: r.video_title,
            author: r.video_channel,
            start_time: r.start_time,
            content: r.content,
            thumbnail_url: r.video_thumbnail,
            url: r.source_type === 'youtube' && r.video_youtube_id 
              ? `https://youtube.com/watch?v=${r.video_youtube_id}` 
              : r.source_url,
            score: r.score,
          }));

          // Update conversation context sources
          if (conversation) {
            sources.forEach(s => {
              if (!conversation!.contextSources.includes(s.source_id)) {
                conversation!.contextSources.push(s.source_id);
              }
            });
          }
        } else {
          console.log(`  💬 Non-question message - using conversation context only`);
          
          // For non-questions, use conversation context only
          // If no conversation exists, create a simple response
          if (!conversation) {
            return res.json({
              answer: "I'm here to help! Ask me a question about your knowledge base, and I'll search for relevant information.",
              sources: [],
              conversationId: null,
            });
          }
        }

        // Build system prompt
        let systemPrompt = preferences.defaultSystemPrompt || 
          `You are a helpful AI assistant with access to a multi-source knowledge base including YouTube videos, articles, documents, and audio transcriptions.

INSTRUCTIONS:
1. Answer questions using ONLY the information in the provided context (if any)
2. If the context doesn't contain the answer, say "I don't have information about that in the knowledge base"
3. Cite sources naturally in your answer by mentioning the source title
4. Be conversational and concise
5. Do not make up information`;

        // Add context to system prompt if we have sources
        if (shouldSearchSources && results.length > 0) {
          const context = results
            .map((r, i) => {
              const sourceLabel = r.source_type === 'youtube' 
                ? `${r.video_title} (Video)`
                : r.source_type === 'text'
                ? `${r.video_title} (Article)`
                : r.source_type === 'document'
                ? `${r.video_title} (Document)`
                : r.source_type === 'audio'
                ? `${r.video_title} (Audio)`
                : r.video_title;
              
              return `[${sourceLabel}${r.video_channel ? ' by ' + r.video_channel : ''}]\n${r.content}`;
            })
            .join('\n\n---\n\n');
          
          systemPrompt += `\n\nCONTEXT:\n${context}`;
        }

        // Use conversation's custom prompt if available
        if (conversation?.customPrompt) {
          systemPrompt = conversation.customPrompt;
        }

        // Build conversation history for context
        const conversationHistory = conversation 
          ? conversation.messages
              .filter(m => m.role !== 'system') // Exclude system messages from history
              .map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              }))
          : [];

        // Get AI response with preferences and conversation history
        const answer = await chatCompletion(
          systemPrompt,
          message,
          {
            temperature: preferences.temperature,
            maxTokens: preferences.maxTokens,
            model: preferences.model,
            conversationHistory,
          }
        );

        // Create or update conversation
        if (!conversation) {
          // Create new conversation
          conversation = await Conversation.create({
            userId,
            title: generateConversationTitle(message),
            messages: [
              {
                role: 'user',
                content: message,
                timestamp: new Date(),
                sources: sources.map(s => ({
                  source_id: s.source_id,
                  source_title: s.source_title,
                  source_type: s.source_type,
                  content: s.content,
                  score: s.score,
                })),
              },
              {
                role: 'assistant',
                content: answer,
                timestamp: new Date(),
              },
            ],
            contextSources: sources.map(s => s.source_id),
            lastMessageAt: new Date(),
          });
        } else {
          // Update existing conversation
          conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            sources: sources.map(s => ({
              source_id: s.source_id,
              source_title: s.source_title,
              source_type: s.source_type,
              content: s.content,
              score: s.score,
            })),
          });
          conversation.messages.push({
            role: 'assistant',
            content: answer,
            timestamp: new Date(),
          });
          conversation.lastMessageAt = new Date();
          await conversation.save();
        }

        return res.json({
          answer,
          sources,
          conversationId: conversation._id.toString(),
        });
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Handle vector search index not ready
      if (error.message?.includes('vector_index') || error.message?.includes('$vectorSearch')) {
        return res.status(500).json({ 
          error: "Vector search index is not ready yet. Please create the vector_index in MongoDB Atlas as described in the setup instructions." 
        });
      }
      
      return res.status(500).json({ 
        error: error.message || "Failed to process your question. Please try again." 
      });
    }
  });

  // ==================== CONVERSATION ENDPOINTS ====================

  // GET /api/conversations - List all user conversations
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      await connectDB();
      const userId = req.user!.id;

      const conversations = await Conversation.find({ userId })
        .sort({ lastMessageAt: -1 })
        .select('title lastMessageAt created_at updated_at')
        .lean();

      return res.json({ conversations });
    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/conversations - Create new conversation
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      await connectDB();
      const userId = req.user!.id;
      const { title, customPrompt } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const conversation = await Conversation.create({
        userId,
        title: title.trim(),
        customPrompt: customPrompt?.trim() || undefined,
        messages: [],
        contextSources: [],
        lastMessageAt: new Date(),
      });

      return res.status(201).json({
        conversation: {
          _id: conversation._id.toString(),
          title: conversation.title,
          customPrompt: conversation.customPrompt || null,
          messages: conversation.messages,
          contextSources: conversation.contextSources,
          lastMessageAt: conversation.lastMessageAt,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        },
      });
    } catch (error: any) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/conversations/:id - Get conversation with full history
  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      await connectDB();
      const userId = req.user!.id;
      const { id } = req.params;

      const conversation = await Conversation.findOne({ _id: id, userId });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.json({
        conversation: {
          _id: conversation._id.toString(),
          title: conversation.title,
          customPrompt: conversation.customPrompt || null,
          messages: conversation.messages,
          contextSources: conversation.contextSources,
          lastMessageAt: conversation.lastMessageAt,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        },
      });
    } catch (error: any) {
      console.error('Get conversation error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /api/conversations/:id - Update conversation (title, customPrompt)
  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      await connectDB();
      const userId = req.user!.id;
      const { id } = req.params;
      const { title, customPrompt } = req.body;

      const conversation = await Conversation.findOne({ _id: id, userId });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const updates: any = {};
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          return res.status(400).json({ error: 'Title must be a non-empty string' });
        }
        updates.title = title.trim();
      }
      if (customPrompt !== undefined) {
        updates.customPrompt = customPrompt?.trim() || undefined;
      }

      Object.assign(conversation, updates);
      await conversation.save();

      return res.json({
        success: true,
        conversation: {
          _id: conversation._id.toString(),
          title: conversation.title,
          customPrompt: conversation.customPrompt || null,
          messages: conversation.messages,
          contextSources: conversation.contextSources,
          lastMessageAt: conversation.lastMessageAt,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        },
      });
    } catch (error: any) {
      console.error('Update conversation error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/conversations/:id - Delete conversation
  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      await connectDB();
      const userId = req.user!.id;
      const { id } = req.params;

      const conversation = await Conversation.findOneAndDelete({ _id: id, userId });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Delete conversation error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/debug/database - Show database info
  app.get("/api/debug/database", async (req, res) => {
    try {
      const conn = await connectDB();
      
      const videoCount = await Video.countDocuments();
      const chunkCount = await Chunk.countDocuments();
      
      // Get sample chunk to see structure
      const sampleChunk = await Chunk.findOne().lean();
      
      return res.json({
        database: conn.connection.db?.databaseName || 'unknown',
        collections: {
          videos: {
            name: Video.collection.name,
            count: videoCount,
          },
          chunks: {
            name: Chunk.collection.name,
            count: chunkCount,
            sampleEmbeddingDimension: sampleChunk?.embedding?.length || 0,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // GET /api/videos - List all videos (backwards compatibility)
  app.get("/api/videos", requireAuth, async (req, res) => {
    try {
      // Ensure MongoDB is connected
      await connectDB();
      
      const videos = await Video.find()
        .sort({ created_at: -1 })
        .lean();

      return res.json({ 
        videos: videos.map(v => ({
          ...v,
          _id: v._id.toString(),
        }))
      });
    } catch (error: any) {
      console.error('List videos error:', error);
      return res.status(500).json({ 
        error: "Failed to fetch videos" 
      });
    }
  });

  // GET /api/sources - List all sources (videos, text, documents, audio)
  app.get("/api/sources", requireAuth, async (req, res) => {
    try {
      await connectDB();
      
      // Get all sources
      const sources = await Source.find()
        .sort({ created_at: -1 })
        .lean();

      // Also get old videos for backwards compatibility
      const oldVideos = await Video.find()
        .sort({ created_at: -1 })
        .lean();

      // Convert old videos to source format
      const videosAsSources = oldVideos.map(v => ({
        _id: v._id.toString(),
        source_type: 'youtube',
        title: v.title,
        youtube_id: v.youtube_id,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        channel_name: v.channel_name,
        created_at: v.created_at,
      }));

      // Combine and return all sources
      const allSources = [
        ...sources.map(s => ({
          ...s,
          _id: s._id.toString(),
        })),
        ...videosAsSources
      ].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      return res.json({ sources: allSources });
    } catch (error: any) {
      console.error('List sources error:', error);
      return res.status(500).json({ 
        error: "Failed to fetch sources" 
      });
    }
  });

  // DELETE /api/sources/:id - Delete a source and its chunks
  app.delete("/api/sources/:id", requireAuth, async (req, res) => {
    try {
      await connectDB();
      
      const { id } = req.params;

      // Find the source
      const source = await Source.findById(id);
      if (!source) {
        // Also check old Video collection for backwards compatibility
        const video = await Video.findById(id);
        if (!video) {
          return res.status(404).json({ 
            error: "Source not found" 
          });
        }
        
        // Delete video and its chunks
        await Chunk.deleteMany({ video_id: id });
        await Video.deleteOne({ _id: id });
        
        console.log(`✅ Deleted legacy video ${id} and its chunks`);
        return res.json({ success: true });
      }

      // Delete all chunks associated with this source
      await Chunk.deleteMany({ source_id: id });
      
      // Delete the source document
      await Source.deleteOne({ _id: id });
      
      console.log(`✅ Deleted source ${id} and its chunks`);
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Delete source error:', error);
      return res.status(500).json({ 
        error: error.message || "Failed to delete source" 
      });
    }
  });

  // PATCH /api/sources/:id - Update source metadata
  app.patch("/api/sources/:id", requireAuth, async (req, res) => {
    try {
      await connectDB();
      
      const { id } = req.params;
      const { title, author } = req.body;

      // Validate that at least one field is provided
      if (!title && author === undefined) {
        return res.status(400).json({ 
          error: "At least one field (title or author) must be provided" 
        });
      }

      // Validate title if provided
      if (title !== undefined && (!title || title.trim().length === 0)) {
        return res.status(400).json({ 
          error: "Title cannot be empty" 
        });
      }

      // Find and update the source
      const source = await Source.findById(id);
      if (!source) {
        // Also check old Video collection for backwards compatibility
        const video = await Video.findById(id);
        if (!video) {
          return res.status(404).json({ 
            error: "Source not found" 
          });
        }
        
        // Update legacy video
        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        if (author !== undefined) updateData.channel_name = author?.trim() || undefined;
        
        await Video.updateOne({ _id: id }, updateData);
        console.log(`✅ Updated legacy video ${id}`);
        return res.json({ success: true });
      }

      // Update source
      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (author !== undefined) updateData.author = author?.trim() || undefined;

      await Source.updateOne({ _id: id }, updateData);
      
      console.log(`✅ Updated source ${id}`);
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Update source error:', error);
      return res.status(500).json({ 
        error: error.message || "Failed to update source" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// youtubei.js returns duration in milliseconds, convert to seconds
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Pad with zeros
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}