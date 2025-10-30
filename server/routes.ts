import type { Express } from "express";
import { createServer, type Server } from "http";
import { Innertube } from 'youtubei.js';
import connectDB from "./lib/mongodb";
import Video from "./lib/models/Video";
import Chunk from "./lib/models/Chunk";
import { extractVideoId, getYoutubeThumbnail } from "./lib/youtube";
import { createChunks, calculateDuration } from "./lib/chunking";
import { generateEmbeddings, chatCompletion, generateEmbedding } from "./lib/openai";
import { importVideoSchema, chatSchema } from "@shared/schema";

// Initialize YouTube client once at module scope for better performance
let youtubeClient: Innertube | null = null;
async function getYoutubeClient() {
  if (!youtubeClient) {
    youtubeClient = await Innertube.create();
  }
  return youtubeClient;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Connect to MongoDB (non-blocking to allow app to start)
  connectDB().catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Please check:');
    console.error('1. Your MongoDB URI is correct');
    console.error('2. Your IP address is whitelisted in MongoDB Atlas');
    console.error('3. Your MongoDB Atlas cluster is running');
  });

  // POST /api/import-video - Import and process YouTube video
  app.post("/api/import-video", async (req, res) => {
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
      const existingVideo = await Video.findOne({ youtube_id: videoId });
      if (existingVideo) {
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
        videoDurationSeconds = videoInfo.basic_info?.duration || 0;
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

      // Create video document
      const video = await Video.create({
        youtube_id: videoId,
        title,
        thumbnail_url: thumbnailUrl,
        duration,
      });

      // Create chunks
      const chunks = createChunks(transcript);
      
      if (chunks.length === 0) {
        await Video.deleteOne({ _id: video._id });
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
        video_id: video._id,
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
        videoId: String(video._id)
      });
    } catch (error: any) {
      console.error('Import video error:', error);
      return res.status(500).json({ 
        error: error.message || "Failed to import video. Please try again." 
      });
    }
  });

  // POST /api/chat - Chat with RAG using vector search
  app.post("/api/chat", async (req, res) => {
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
        {
          $lookup: {
            from: "videos",
            localField: "video_id",
            foreignField: "_id",
            as: "video",
          },
        },
        {
          $unwind: "$video",
        },
        {
          $project: {
            content: 1,
            start_time: 1,
            score: 1,
            video_id: "$video._id",
            video_title: "$video.title",
            video_youtube_id: "$video.youtube_id",
            video_channel: "$video.channel_name",
            video_thumbnail: "$video.thumbnail_url",
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

      // Build context from top chunks
      const context = results
        .map((r, i) => `[${r.video_title} - ${formatTimestamp(r.start_time)}]\n${r.content}`)
        .join('\n\n---\n\n');

      // Create system prompt
      const systemPrompt = `You are a helpful AI assistant with access to a knowledge base of YouTube video transcripts.

INSTRUCTIONS:
1. Answer questions using ONLY the information in the provided context
2. If the context doesn't contain the answer, say "I don't have information about that in the knowledge base"
3. Cite sources naturally in your answer using the format: [Video Title - Timestamp]
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

  // GET /api/videos - List all videos
  app.get("/api/videos", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to format timestamp
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
