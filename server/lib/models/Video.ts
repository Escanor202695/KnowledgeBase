import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideo extends Document {
  youtube_id: string;
  title: string;
  channel_name?: string;
  thumbnail_url: string;
  duration?: number;
  created_at: Date;
}

const VideoSchema = new Schema<IVideo>({
  youtube_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  channel_name: {
    type: String,
  },
  thumbnail_url: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Prevent model recompilation in development hot reload
const Video: Model<IVideo> = mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);

export default Video;
