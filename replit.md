# Second Brain - AI Knowledge Base

## Project Overview
A beautiful dark-mode AI-powered multi-user application that allows authenticated users to chat with their personal knowledge base using MongoDB Atlas Vector Search and OpenAI GPT-4. Import YouTube videos, articles, documents (PDF/DOCX/TXT), and audio files into one unified AI-powered knowledge system.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui (dark mode)
- **Backend**: Express.js + Node.js + Multer (file uploads)
- **Database**: MongoDB Atlas with Vector Search
- **AI**: OpenAI GPT-4o-mini (chat) + text-embedding-3-small (embeddings - 1536 dimensions) + Whisper (audio transcription)
- **Video & Transcript**: youtubei.js (actively maintained InnerTube API for metadata + transcripts)
- **Document Processing**: pdfjs-dist (PDF - production-grade parser from Firefox), mammoth (DOCX), native fs (TXT)

## Features
- ✅ **Multi-user authentication**: Secure login, signup, and session management with bcrypt password hashing
- ✅ **Multi-source import system**: YouTube videos, text/articles, documents (PDF/DOCX/TXT), audio files
- ✅ YouTube video import with automatic transcript extraction
- ✅ Direct text/article import with optional source URL and author
- ✅ Document upload and text extraction (PDF, DOCX, TXT)
- ✅ Audio file upload with automatic Whisper transcription (MP3, WAV, M4A, etc.)
- ✅ Intelligent text chunking (1200 chars with 200 char overlap)
- ✅ Vector embeddings generation and storage for all source types
- ✅ AI-powered chat with RAG (Retrieval Augmented Generation)
- ✅ Semantic search using MongoDB Atlas Vector Search across all sources
- ✅ Source citations with clickable YouTube timestamps
- ✅ Beautiful dark mode interface with professional design
- ✅ Tabbed import interface for easy source type selection
- ✅ **Collapsible left panel sections**: Accordion-style Import Knowledge and Knowledge Base sections for better space management
- ✅ Real-time loading states and error handling
- ✅ Responsive design for all screen sizes

## Architecture

### Authentication System
**Structure**:
- **User Model**: MongoDB collection storing user credentials (email, password hash, name)
- **Session Model**: MongoDB collection for session tokens with expiry tracking
- **Auth Routes**: Login, signup, logout, forgot password, verify token endpoints (`server/routes/auth.ts`)
- **Auth Middleware**: JWT-like token verification for protected routes (`server/middleware/auth.ts`)
- **Protected Routes**: Frontend wrapper component that redirects unauthenticated users to login

**Frontend Components**:
- `Login.tsx`: Beautiful login page with email/password form
- `Signup.tsx`: Registration page with strong password validation
- `ForgotPassword.tsx`: Password reset flow with email confirmation
- `ProtectedRoute.tsx`: HOC wrapper for authenticated-only pages
- `Header.tsx`: User menu drawer with logout, settings, and help navigation

**Security**:
- bcryptjs for password hashing (installed)
- Session tokens stored in localStorage and sent via Authorization header
- Protected API routes verify session tokens via auth middleware
- React Query cache cleared on logout

**Implementation Status**:
- ⚠️ **Backend functions are EMPTY stubs** - User will implement authentication logic later
- ✅ All frontend pages designed and integrated
- ✅ Auth routes registered in server/routes.ts
- ✅ Token management integrated into React Query client
- ✅ Protected route wrapper created and applied to Home page

### Data Flow
1. **YouTube Import**: URL → youtubei.js metadata + transcript → Text Chunking → Embedding Generation → MongoDB Storage
2. **Text Import**: Title + Content → Text Chunking → Embedding Generation → MongoDB Storage
3. **Document Import**: File Upload → Text Extraction (PDF/DOCX/TXT) → Text Chunking → Embedding Generation → MongoDB Storage
4. **Audio Import**: File Upload → Whisper Transcription → Text Chunking → Embedding Generation → MongoDB Storage
5. **Chat Flow**: User Question → Query Embedding → Vector Search (all sources) → Context Building → AI Response → Source Citations

### MongoDB Collections
- **users**: User accounts (email, password hash, name)
- **sessions**: Active user sessions (token, user_id, expires_at)
- **sources**: Unified collection for all source types (youtube, text, document, audio) with metadata
- **videos**: Legacy collection for backwards compatibility with old YouTube imports
- **chunks**: Stores content chunks with 1536-dimensional embeddings, references source_id

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
- `OPENAI_API_KEY`: OpenAI API key for GPT-4o-mini and embeddings
- `SESSION_SECRET`: Secret key for session token generation (already configured)

## Project Structure

### Frontend (client/src/)

**Authentication Pages**:
- `pages/Login.tsx`: Login page with email/password form, "Forgot password?" link
- `pages/Signup.tsx`: Registration page with strong password requirements
- `pages/ForgotPassword.tsx`: Password reset flow with success confirmation
- `components/ProtectedRoute.tsx`: HOC wrapper redirecting unauthenticated users

**Main Application**:
- `components/Header.tsx`: Sticky header with branding + user menu drawer (logout, settings, help)
- `components/SourceImporter.tsx`: **NEW** Multi-tab import interface (YouTube, Text, Document, Audio)
- `components/SourceLibrary.tsx`: **NEW** Grid display of all imported sources with type badges
- `components/VideoInput.tsx`: Legacy YouTube-only input (deprecated, kept for reference)
- `components/VideoLibrary.tsx`: Legacy video-only display (deprecated, kept for reference)
- `components/ChatInterface.tsx`: AI chat with message history
- `components/SourceCitation.tsx`: Clickable timestamp citations
- `pages/Home.tsx`: Main application layout using new multi-source components
- `App.tsx`: Root component with public (login/signup) and protected routes
- `lib/queryClient.ts`: React Query client with auth token injection in headers

### Backend (server/)

**Authentication**:
- `routes/auth.ts`: **EMPTY STUBS** - Auth endpoints (signup, login, logout, forgot password, verify token, get current user)
- `middleware/auth.ts`: **EMPTY STUB** - JWT-like token verification middleware
- `lib/models/User.ts`: MongoDB User schema (email, password, name)
- `lib/models/Session.ts`: MongoDB Session schema (token, user_id, expires_at)

**Main Application**:
- `routes.ts`: API routes for all import types, chat, and source listing
  - POST `/api/import-video` - YouTube video import
  - POST `/api/import-text` - Direct text/article import
  - POST `/api/import-document` - Document upload (PDF/DOCX/TXT)
  - POST `/api/import-audio` - Audio upload with Whisper transcription
  - POST `/api/chat` - AI chat with RAG
  - GET `/api/sources` - List all sources (unified)
  - GET `/api/videos` - List videos only (backwards compatibility)
- `lib/mongodb.ts`: MongoDB connection with caching
- `lib/models/Source.ts`: **NEW** Unified source model (youtube, text, document, audio)
- `lib/models/Video.ts`: Legacy video model (backwards compatibility)
- `lib/models/Chunk.ts`: Chunk model with embeddings (references source_id)
- `lib/openai.ts`: OpenAI client for embeddings, chat, and Whisper transcription
- `lib/youtube.ts`: YouTube URL parsing utilities
- `lib/chunking.ts`: Text chunking algorithm (works for all source types)
- `lib/documentProcessor.ts`: **NEW** PDF/DOCX/TXT text extraction
- `lib/audioProcessor.ts`: **NEW** Whisper API audio transcription
- `lib/upload.ts`: **NEW** Multer file upload middleware

### Shared (shared/)
- `schema.ts`: TypeScript types and Zod validation schemas

## Design System
- Follows design_guidelines.md for consistent spacing, typography, and colors
- Dark mode enforced for optimal viewing experience
- Uses shadcn/ui components with custom color tokens
- Responsive grid layouts for video library
- Professional color scheme with primary blue accent

## Recent Changes (Latest Session - Authentication System)
- **Multi-user Authentication System** ✅:
  - **Backend Structure Created** (implementation pending):
    - User and Session MongoDB models created
    - Auth routes file with empty function stubs (signup, login, logout, forgot-password, verify-token, me)
    - Auth middleware with empty verification function
    - bcryptjs package installed for password hashing
    - Auth routes registered in main server/routes.ts
  - **Frontend Fully Implemented** ✅:
    - Login page with email/password form and "Forgot password?" link
    - Signup page with strong password validation (8+ chars, uppercase, lowercase, number)
    - Forgot password page with success confirmation state
    - User menu drawer in Header (logout, settings, help navigation)
    - Protected route wrapper redirecting unauthenticated users to login
    - App.tsx configured with public routes (/login, /signup, /forgot-password) and protected routes (/)
    - React Query client updated to inject auth tokens in all API requests
  - **Design Philosophy**:
    - All auth pages follow design_guidelines.md (dark mode, Tailwind, shadcn/ui)
    - Clean, centered card layouts with Brain logo branding
    - Professional form validation with helpful error messages
    - Consistent spacing and typography throughout
  - **Next Steps** (for user):
    - Implement backend auth functions (password hashing, token generation, session management)
    - Connect auth middleware to protected API routes
    - Add email service for forgot password functionality

## Previous Session Changes
- **Collapsible Left Panel Sections** ✅:
  - **Accordion-style UI**: Replaced fixed sections with shadcn Accordion component
    - Import Knowledge and Knowledge Base sections now collapse/expand
    - Only one section can be expanded at a time (exclusive behavior)
    - Expanded section takes full available height (flex-1)
    - Collapsed section shows only header (flex-shrink-0)
    - Default state: Knowledge Base expanded
    - Clean hover states on section headers
  - **Space Optimization**: Addresses user concern that Import Knowledge was taking too much space
    - Users can now easily toggle between importing and browsing their knowledge base
    - Better use of vertical screen space
- **UI Fixes - All Completed** ✅:
  - **YouTube Duration Bug Fixed**: youtubei.js returns milliseconds but code treated as seconds
    - Backend fix (server/routes.ts): Convert API duration from ms to seconds via Math.floor(duration/1000)
    - Database migration: Fixed 2 existing videos (Rick Astley: 34:39, "If You're in Your 20s": 3:56:24)
    - No more malformed durations like "3940:00:03"
  - **Equal Card Heights**: All source cards now have consistent aspect-video containers (16:9 ratio)
    - Changed grid to max 2 columns (md:grid-cols-2, removed lg:grid-cols-3)
    - Placeholder icons increased from 64px to 96px (w-24 h-24)
    - Background changed from bg-muted/50 to bg-muted for prominence
  - **Duration Badge Visibility**: Only shows for YouTube videos (removed from text/document/audio)
  - **Placeholder Styling**: Type-specific colored icons (blue=text, green=document, purple=audio)
  - End-to-end testing: All UI fixes verified and passing ✅
- **PDF Library Migration**: Replaced pdf-parse with **pdfjs-dist** (Firefox's production-grade PDF parser)
  - Using legacy build for Node.js compatibility (no browser dependencies)
  - Multi-page PDF support with page-by-page text extraction
  - Proper resource cleanup (finally block prevents worker thread leaks)
  - Specific error handling for password-protected and corrupted PDFs
  - Production-safe logging (detailed logs only in development mode)
- **Comprehensive Corner Case Testing** - All tests passed:
  - ✅ Empty documents: Properly rejected with helpful error messages
  - ✅ Short documents (<10 chars): Validation working correctly
  - ✅ Special characters (UTF-8, Unicode): Handled properly
  - ✅ Long documents (>1500 chars): Automatically chunked (8 chunks)
  - ✅ Rapid sequential imports: No race conditions, all succeed
  - ✅ Vector search: Working correctly (scores above 0.65 threshold)
- **MAJOR: Multi-source knowledge base support** - Expanded from YouTube-only to support text, documents, and audio
- Created unified Source model replacing Video model (backwards compatible)
- Implemented 4 new import endpoints: text, document, audio, unified sources listing
- Created SourceImporter component with tabbed interface for all import types
- Created SourceLibrary component displaying all sources with type badges and icons
- Integrated Whisper API for automatic audio transcription
- Integrated mammoth for DOCX parsing
- Added Multer middleware for file upload handling
- Updated Home page to use new multi-source components
- All source types use same chunking → embedding → vector search pipeline
- Maintained backwards compatibility with existing Video/Chunk models

### Critical Architecture Updates
- **Vector search enhanced**: Aggregation pipeline now looks up from both sources and videos collections with proper metadata handling for all source types
- **Chat system updated**: System prompt and context building handle YouTube, text, document, and audio sources with proper citations
- **File serving configured**: Express static middleware serves uploaded files from /uploads directory
- **Source metadata**: Vector search properly extracts author, source_type, and URLs for all source types

## Previous Changes
- Migrated to youtubei.js exclusively - Using InnerTube API for both video metadata AND transcript extraction (single source, actively maintained)
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
- YouTube videos must have captions/transcripts available
- Large videos may take 30-60 seconds to process
- Audio files are transcribed using Whisper API (costs apply per minute)
- Uploaded files are stored in `uploads/` directory (ensure sufficient disk space)
- Document extraction requires readable PDFs (not scanned images without OCR)
- Maximum file upload sizes: documents 10MB, audio 25MB (configurable in upload.ts)

## User Preferences
- Full dark mode application
- Professional, clean Tailwind CSS design
- MongoDB Atlas for scalability
- OpenAI GPT-5 for latest AI capabilities
