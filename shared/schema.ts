import { z } from "zod";

// Video schema for MongoDB
export interface Video {
  _id: string;
  youtube_id: string;
  title: string;
  channel_name?: string;
  thumbnail_url: string;
  duration?: number;
  created_at: Date;
}

// Chunk schema for MongoDB (stores transcript chunks with embeddings)
export interface Chunk {
  _id: string;
  video_id: string;
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
  sources?: Source[];
  timestamp: Date;
}

// Source citation for AI responses
export interface Source {
  video_id: string;
  youtube_id: string;
  video_title: string;
  channel_name?: string;
  start_time: number;
  content: string;
  thumbnail_url: string;
  score: number;
}

// API request/response types
export const importVideoSchema = z.object({
  youtubeUrl: z.string().min(1, "YouTube URL is required"),
});

export type ImportVideoRequest = z.infer<typeof importVideoSchema>;

export interface ImportVideoResponse {
  success: boolean;
  videoId?: string;
  error?: string;
}

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export type ChatRequest = z.infer<typeof chatSchema>;

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface VideosResponse {
  videos: Video[];
}
