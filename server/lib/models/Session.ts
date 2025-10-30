import mongoose from 'mongoose';

export interface ISession {
  _id?: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

const sessionSchema = new mongoose.Schema<ISession>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ expiresAt: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
