# Second Brain - AI Knowledge Base

## Project Overview
A beautiful dark-mode AI-powered application that allows users to chat with their YouTube video knowledge base using MongoDB Atlas Vector Search and OpenAI GPT-5.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui (dark mode)
- **Backend**: Express.js + Node.js
- **Database**: MongoDB Atlas with Vector Search
- **AI**: OpenAI GPT-5 (chat) + text-embedding-3-small (embeddings - 1536 dimensions)
- **Video & Transcript**: youtubei.js (actively maintained InnerTube API for metadata + transcripts)

## Features
- ✅ YouTube video import with automatic transcript extraction
- ✅ Intelligent text chunking (1200 chars with 200 char overlap)
- ✅ Vector embeddings generation and storage
- ✅ AI-powered chat with RAG (Retrieval Augmented Generation)
- ✅ Semantic search using MongoDB Atlas Vector Search
- ✅ Source citations with clickable YouTube timestamps
- ✅ Beautiful dark mode interface with professional design
- ✅ Real-time loading states and error handling
- ✅ Responsive design for all screen sizes

## Architecture

### Data Flow
1. **Import Flow**: YouTube URL → Transcript Extraction → Text Chunking → Embedding Generation → MongoDB Storage
2. **Chat Flow**: User Question → Query Embedding → Vector Search → Context Building → AI Response → Source Citations

### MongoDB Collections
- **videos**: Stores video metadata (youtube_id, title, thumbnail, duration)
- **chunks**: Stores transcript chunks with 1536-dimensional embeddings

### Vector Search Configuration
- **Index Name**: `vector_index`
- **Dimensions**: 1536
- **Similarity**: Cosine
- **Threshold**: 0.7 minimum score
- **Results**: Top 8 chunks per query

## Important Setup

### MongoDB Atlas Vector Search Index
**CRITICAL**: You must create a vector search index manually in MongoDB Atlas:

1. Go to MongoDB Atlas → Database → Browse Collections
2. Click "Search Indexes" tab → "Create Search Index"
3. Choose "JSON Editor"
4. Database: `second-brain`, Collection: `chunks`
5. Index name: **`vector_index`**
6. Paste this configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "video_id"
    }
  ]
}
```

7. Wait 2-5 minutes for index status to show "Active"

### Environment Variables
- `MONGODB_URI`: MongoDB Atlas connection string
- `OPENAI_API_KEY`: OpenAI API key for GPT-5 and embeddings

## Project Structure

### Frontend (client/src/)
- `components/Header.tsx`: Sticky header with branding
- `components/VideoInput.tsx`: YouTube URL input with React Query mutation
- `components/VideoLibrary.tsx`: Grid display of imported videos
- `components/ChatInterface.tsx`: AI chat with message history
- `components/SourceCitation.tsx`: Clickable timestamp citations
- `pages/Home.tsx`: Main application layout
- `App.tsx`: Root component with routing

### Backend (server/)
- `routes.ts`: API routes for video import, chat, and video listing
- `lib/mongodb.ts`: MongoDB connection with caching
- `lib/models/Video.ts`: Mongoose video model
- `lib/models/Chunk.ts`: Mongoose chunk model with embeddings
- `lib/openai.ts`: OpenAI client for embeddings and chat
- `lib/youtube.ts`: YouTube URL parsing utilities
- `lib/chunking.ts`: Text chunking algorithm

### Shared (shared/)
- `schema.ts`: TypeScript types and Zod validation schemas

## Design System
- Follows design_guidelines.md for consistent spacing, typography, and colors
- Dark mode enforced for optimal viewing experience
- Uses shadcn/ui components with custom color tokens
- Responsive grid layouts for video library
- Professional color scheme with primary blue accent

## Recent Changes
- **Migrated to youtubei.js exclusively** - Using InnerTube API for both video metadata AND transcript extraction (single source, actively maintained)
- Implemented singleton YouTube client for better performance across requests
- Improved error handling with detailed logging for debugging
- Fixed type safety in MongoDB connection (proper Mongoose types) and React Query mutations
- Implemented complete MVP with all core features
- Fixed design guideline violations (removed hover scaling, added proper flex gaps)
- Refactored mutations to use React Query with apiRequest
- Added comprehensive error handling throughout
- Implemented proper cache invalidation for video list updates

## Known Requirements
- MongoDB Atlas IP whitelist must include Replit's IP addresses
- Vector search index must be created manually (cannot be automated)
- Videos must have captions/transcripts available
- Large videos may take 30-60 seconds to process

## User Preferences
- Full dark mode application
- Professional, clean Tailwind CSS design
- MongoDB Atlas for scalability
- OpenAI GPT-5 for latest AI capabilities
