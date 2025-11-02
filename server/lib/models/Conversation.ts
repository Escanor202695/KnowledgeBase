import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversation extends Document {
  userId: string;
  title: string;
  customPrompt?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: Array<{
      source_id: string;
      source_title: string;
      source_type: string;
      content: string;
      score: number;
    }>;
  }>;
  contextSources: string[]; // Array of source IDs already used in this conversation
  lastMessageAt: Date;
  created_at: Date;
  updated_at: Date;
}

const ConversationSchema = new Schema<IConversation>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  customPrompt: {
    type: String,
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    sources: [{
      source_id: String,
      source_title: String,
      source_type: String,
      content: String,
      score: Number,
    }],
  }],
  contextSources: [{
    type: String,
  }],
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });

// Prevent model recompilation in development hot reload
const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;

