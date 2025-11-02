import { z } from "zod";

// Source types supported
export type SourceType = 'youtube' | 'text' | 'document' | 'audio';

// Unified Source schema for MongoDB (replaces Video)
export interface Source {
  _id: string;
  source_type: SourceType;
  title: string;
  content?: string;          // For text sources
  url?: string;              // For YouTube URLs
  youtube_id?: string;       // For YouTube videos
  file_url?: string;         // For uploaded files
  file_type?: string;        // pdf, docx, txt, mp3, etc.
  thumbnail_url?: string;
  duration?: number;         // For audio/video
  author?: string;           // Creator/channel name
  created_at: Date;
}

// Legacy Video interface (for backwards compatibility during migration)
export interface Video extends Source {
  channel_name?: string;
}

// Chunk schema for MongoDB (stores content chunks with embeddings)
export interface Chunk {
  _id: string;
  source_id: string;         // References Source._id
  video_id?: string;         // Legacy field for backwards compatibility
  content: string;
  embedding: number[];
  start_time: number;
  chunk_index: number;
  created_at: Date;
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  timestamp: Date;
}

// Source citation for AI responses
export interface SourceCitation {
  source_id: string;
  source_type: SourceType;
  source_title: string;
  author?: string;
  start_time: number;
  content: string;
  thumbnail_url?: string;
  url?: string;           // YouTube URL or file URL
  score: number;
}

// API request/response types

// YouTube import
export const importVideoSchema = z.object({
  youtubeUrl: z.string().min(1, "YouTube URL is required"),
});
export type ImportVideoRequest = z.infer<typeof importVideoSchema>;

// Text import
export const importTextSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  author: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
});
export type ImportTextRequest = z.infer<typeof importTextSchema>;

// Document import (file upload handled by multer, this is for metadata)
export const importDocumentSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
});
export type ImportDocumentRequest = z.infer<typeof importDocumentSchema>;

// Audio import (file upload handled by multer, this is for metadata)
export const importAudioSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
});
export type ImportAudioRequest = z.infer<typeof importAudioSchema>;

// Generic import response
export interface ImportResponse {
  success: boolean;
  sourceId?: string;
  error?: string;
}

// Legacy response type for backwards compatibility
export interface ImportVideoResponse extends ImportResponse {
  videoId?: string;
}

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatSchema>;

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
  conversationId?: string | null;
}

export interface SourcesResponse {
  sources: Source[];
}

// Legacy response type for backwards compatibility
export interface VideosResponse {
  videos: Video[];
}
