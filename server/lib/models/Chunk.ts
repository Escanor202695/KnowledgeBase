import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IChunk extends Document {
  video_id: Types.ObjectId;
  content: string;
  embedding: number[];
  start_time: number;
  chunk_index: number;
  created_at: Date;
}

const ChunkSchema = new Schema<IChunk>({
  video_id: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  start_time: {
    type: Number,
    required: true,
  },
  chunk_index: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
ChunkSchema.index({ video_id: 1, chunk_index: 1 });

const Chunk: Model<IChunk> = mongoose.models.Chunk || mongoose.model<IChunk>('Chunk', ChunkSchema);

export default Chunk;
