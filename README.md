# Second Brain - AI Knowledge Base

Chat with your YouTube video knowledge base using AI-powered semantic search with MongoDB Atlas Vector Search and OpenAI.

## Features

- 🎥 Import YouTube videos automatically
- 📝 Extract and process video transcripts
- 🤖 AI-powered chat with GPT-5
- 🔍 Semantic search using vector embeddings
- 📍 Source citations with exact timestamps
- 🌙 Beautiful dark mode interface

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js
- **Database**: MongoDB Atlas with Vector Search
- **AI**: OpenAI GPT-5 + text-embedding-3-small
- **Transcript**: youtube-transcript package

## Setup Instructions

### 1. Environment Variables

The following secrets are required (already configured in Replit Secrets):
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `MONGODB_URI` - Your MongoDB Atlas connection string

### 2. MongoDB Atlas Vector Search Index Setup

**CRITICAL**: You must create a vector search index manually in MongoDB Atlas:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster → **Database** → **Browse Collections**
3. Click the **Search Indexes** tab (or **Atlas Search** in older UI)
4. Click **Create Search Index**
5. Choose **JSON Editor**
6. Select:
   - **Database**: `second-brain` (or your database name from connection string)
   - **Collection**: `chunks`
7. Paste this JSON configuration:

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

8. Name it exactly: **`vector_index`**
9. Click **Create Search Index**
10. Wait 2-5 minutes for the index to build (status should show "Active")

**Note**: Without this index, the chat feature will not work. The vector search requires this specific index configuration.

### 3. Run the Application

The application is already running in Replit. Just:
1. Make sure the workflow "Start application" is running
2. Wait for MongoDB Atlas vector index to be active
3. Open the web view to see your Second Brain app

## How to Use

### Import Videos
1. Paste any YouTube URL into the input field
2. Click "Import Video" - the system will:
   - Extract the video transcript
   - Break it into semantic chunks
   - Generate embeddings using OpenAI
   - Store everything in MongoDB

### Chat with Your Knowledge
1. Type questions about your imported videos
2. The AI will:
   - Search your knowledge base using vector similarity
   - Find the most relevant transcript segments
   - Generate an answer citing specific sources
   - Provide clickable timestamps to jump to exact moments

## Architecture

### Data Flow
1. **Import**: YouTube URL → Transcript Extraction → Text Chunking → Embedding Generation → MongoDB Storage
2. **Chat**: User Question → Query Embedding → Vector Search → Context Building → AI Response → Source Citations

### Vector Search
- **Model**: text-embedding-3-small (1536 dimensions)
- **Similarity**: Cosine similarity
- **Threshold**: 0.7 minimum score
- **Chunk Size**: 1200 characters with 200 character overlap

### Database Schema

**Videos Collection**:
- `youtube_id`: Unique video identifier
- `title`: Video title
- `thumbnail_url`: YouTube thumbnail
- `duration`: Video length in seconds
- `created_at`: Import timestamp

**Chunks Collection**:
- `video_id`: Reference to video
- `content`: Transcript text chunk
- `embedding`: 1536-dimensional vector
- `start_time`: Timestamp in seconds
- `chunk_index`: Position in video

## Troubleshooting

### "Vector search index is not ready"
- Ensure you created the `vector_index` in MongoDB Atlas
- Wait for the index status to show "Active" (takes 2-5 minutes)
- Verify the index name is exactly `vector_index`

### "Could not fetch transcript"
- Video may not have captions available
- Video might be private or age-restricted
- Try a different video with auto-generated or manual captions

### Import is slow
- Processing includes: transcript fetch, chunking, embedding generation
- Large videos may take 30-60 seconds
- Progress is shown with loading indicator

## Development

- Frontend: `client/src/`
- Backend: `server/`
- Shared types: `shared/schema.ts`
- MongoDB models: `server/lib/models/`

## Credits

Built with modern web technologies and AI-powered semantic search.
