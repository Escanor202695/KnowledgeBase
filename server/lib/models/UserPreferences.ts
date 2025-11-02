import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserPreferences extends Document {
  userId: string;
  defaultSystemPrompt?: string;
  temperature: number;
  maxTokens: number;
  model: string;
  created_at: Date;
  updated_at: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  defaultSystemPrompt: {
    type: String,
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2,
  },
  maxTokens: {
    type: Number,
    default: 8192,
    min: 1000,
    max: 16000,
  },
  model: {
    type: String,
    default: 'gpt-3.5-turbo',
  },
}, {
  timestamps: true,
});

// Prevent model recompilation in development hot reload
const UserPreferences: Model<IUserPreferences> = mongoose.models.UserPreferences || mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);

export default UserPreferences;

