# Second Brain - AI Knowledge Base

## Overview
A beautiful dark-mode AI-powered multi-user application enabling authenticated users to chat with their personal knowledge base. It unifies various content types—YouTube videos, articles, documents (PDF/DOCX/TXT), and audio files—into a single AI-driven system using MongoDB Atlas Vector Search and OpenAI GPT-4. The project aims to provide a comprehensive, intelligent knowledge management solution.

## User Preferences
- Full dark mode application
- Professional, clean Tailwind CSS design
- MongoDB Atlas for scalability
- OpenAI GPT-5 for latest AI capabilities

## System Architecture
The application features a React + TypeScript + Tailwind CSS frontend with shadcn/ui for a dark-mode interface, an Express.js + Node.js backend, and MongoDB Atlas with Vector Search as the database. OpenAI GPT-4o-mini handles chat, `text-embedding-3-small` generates embeddings (1536 dimensions), and Whisper powers audio transcription. Content ingestion uses `youtubei.js` for YouTube, `pdfjs-dist` for PDFs, `mammoth` for DOCX, and native file system for TXT.

**Key Features:**
- Multi-user authentication with secure login, signup, and session management.
- Multi-source import system for YouTube videos, articles, documents, and audio files.
- Automatic transcript extraction for YouTube and audio via Whisper.
- Intelligent text chunking (1200 chars with 200 char overlap) and vector embedding generation.
- AI-powered chat with Retrieval Augmented Generation (RAG) and semantic search across all sources using MongoDB Atlas Vector Search.
- Source citations, including clickable YouTube timestamps.
- Responsive design and professional dark mode UI.

**Authentication System:**
- Uses a `User` model for credentials and a `Session` model for tokens in MongoDB.
- Frontend includes `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, and `ProtectedRoute.tsx` for secure access.
- `bcryptjs` is used for password hashing; session tokens are stored in `localStorage`.

**Data Flow:**
1.  **Ingestion:** Content (YouTube URL, text, document, audio file) is processed for text extraction (transcription for audio/video, parsing for documents).
2.  **Chunking:** Extracted text is split into intelligent chunks.
3.  **Embedding:** Chunks are converted into 1536-dimensional vector embeddings.
4.  **Storage:** Embeddings and source metadata are stored in MongoDB Atlas, primarily in the `chunks` collection, referencing the `sources` collection.
5.  **Chat/Query:** User questions are embedded, used for vector search across stored chunks, context is built from relevant results, and an OpenAI GPT model generates a response with citations.

**MongoDB Collections:**
-   `users`: User accounts.
-   `sessions`: Active user sessions.
-   `sources`: Unified collection for all imported content types with metadata.
-   `chunks`: Stores content chunks with embeddings, linked to `source_id`.

**Vector Search Configuration:**
-   **Index Name:** `vector_index` (must be manually created in Atlas).
-   **Dimensions:** 1536.
-   **Similarity:** Cosine.
-   **Threshold:** 0.7 minimum score.
-   **Results:** Top 8 chunks per query.

**UI/UX Decisions:**
-   Follows `design_guidelines.md` for consistent styling.
-   Enforced dark mode using `shadcn/ui` with custom color tokens.
-   Collapsible left panel sections (`Import Knowledge`, `Knowledge Base`) using an accordion-style UI for space optimization.
-   Responsive grid layouts and professional color schemes.

## External Dependencies
-   **Database:** MongoDB Atlas (with Vector Search)
-   **AI/ML:**
    -   OpenAI GPT-4o-mini (chat)
    -   OpenAI `text-embedding-3-small` (embeddings)
    -   OpenAI Whisper API (audio transcription)
-   **Video Processing:** `youtubei.js` (YouTube metadata and transcript extraction)
-   **Document Processing:**
    -   `pdfjs-dist` (PDF text extraction)
    -   `mammoth` (DOCX text extraction)
-   **File Uploads:** `Multer` (Node.js middleware)
-   **Authentication:** `bcryptjs` (password hashing)