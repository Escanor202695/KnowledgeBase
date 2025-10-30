import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IChunk extends Document {
  source_id: Types.ObjectId;  // New field for Source reference
  video_id?: Types.ObjectId;  // Legacy field for backwards compatibility
  content: string;
  embedding: number[];
  start_time: number;
  chunk_index: number;
  created_at: Date;
}

const ChunkSchema = new Schema<IChunk>({
  source_id: {
    type: Schema.Types.ObjectId,
    ref: 'Source',
    required: true,
    index: true,
  },
  video_id: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
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

// Compound indexes for efficient queries
ChunkSchema.index({ source_id: 1, chunk_index: 1 });
ChunkSchema.index({ video_id: 1, chunk_index: 1 }); // Legacy index for backwards compatibility

const Chunk: Model<IChunk> = mongoose.models.Chunk || mongoose.model<IChunk>('Chunk', ChunkSchema);

export default Chunk;
