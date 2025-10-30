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
import { extractVideoId, getYoutubeThumbnail } from "./lib/youtube";
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

      // Extract video ID
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        return res.status(400).json({ 
          error: "Invalid YouTube URL. Please provide a valid YouTube video URL." 
        });
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
        const videoInfo = await youtube.getInfo(videoId);
        
        // Extract metadata
        title = videoInfo.basic_info?.title || title;
        // youtubei.js returns duration in milliseconds, convert to seconds
        const durationFromAPI = videoInfo.basic_info?.duration || 0;
        videoDurationSeconds = Math.floor(durationFromAPI / 1000);
        console.log(`  ✅ Retrieved metadata: "${title}" (${videoDurationSeconds}s)`);
        
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

      const { message } = validation.data;

      console.log(`💬 Chat question: "${message}"`);
      
      // Diagnostic: Check if any chunks exist
      const totalChunks = await Chunk.countDocuments();
      console.log(`  📊 Total chunks in database: ${totalChunks}`);
      
      if (totalChunks === 0) {
        return res.json({
          answer: "I couldn't find any videos in your knowledge base. Please import some YouTube videos first!",
          sources: [],
        });
      }
      
      // Generate embedding for the question
      console.log(`  🔢 Generating embedding for question...`);
      const questionEmbedding = await generateEmbedding(message);
      console.log(`  ✅ Generated query embedding (dimension: ${questionEmbedding.length})`);

      // Perform vector search using MongoDB Atlas Vector Search
      console.log(`  🔍 Searching vector index for relevant chunks...`);
      let results;
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
        return res.json({
          answer: "I couldn't find any relevant information in your knowledge base to answer that question. Try importing more videos or asking about topics covered in your existing videos.",
          sources: [],
        });
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

      // Create system prompt
      const systemPrompt = `You are a helpful AI assistant with access to a multi-source knowledge base including YouTube videos, articles, documents, and audio transcriptions.

INSTRUCTIONS:
1. Answer questions using ONLY the information in the provided context
2. If the context doesn't contain the answer, say "I don't have information about that in the knowledge base"
3. Cite sources naturally in your answer by mentioning the source title
4. Be conversational and concise
5. Do not make up information

CONTEXT:
${context}`;

      // Get AI response
      const answer = await chatCompletion(systemPrompt, message);

      // Format top 3 sources
      const sources = results.slice(0, 3).map(r => ({
        video_id: r.video_id.toString(),
        youtube_id: r.video_youtube_id,
        video_title: r.video_title,
        channel_name: r.video_channel,
        start_time: r.start_time,
        content: r.content,
        thumbnail_url: r.video_thumbnail,
        score: r.score,
      }));

      return res.json({ answer, sources });
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to format timestamp
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
