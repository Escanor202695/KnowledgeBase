import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SourceType } from '@shared/schema';

export interface ISource extends Document {
  source_type: SourceType;
  title: string;
  content?: string;
  url?: string;
  youtube_id?: string;
  file_url?: string;
  file_type?: string;
  thumbnail_url?: string;
  duration?: number;
  author?: string;
  created_at: Date;
}

const SourceSchema = new Schema<ISource>({
  source_type: {
    type: String,
    required: true,
    enum: ['youtube', 'text', 'document', 'audio'],
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  url: {
    type: String,
  },
  youtube_id: {
    type: String,
    sparse: true, // Only index non-null values
    unique: true,
  },
  file_url: {
    type: String,
  },
  file_type: {
    type: String,
  },
  thumbnail_url: {
    type: String,
  },
  duration: {
    type: Number,
  },
  author: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient queries
SourceSchema.index({ source_type: 1, created_at: -1 });

// Prevent model recompilation in development hot reload
const Source: Model<ISource> = mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);

export default Source;
