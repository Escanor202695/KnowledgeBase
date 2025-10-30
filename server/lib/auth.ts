import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from './models/User';
import { Session, ISession } from './models/Session';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hashed password
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new user session
 */
export async function createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<ISession> {
  const token = generateToken();
  
  // Session expires in 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const session = await Session.create({
    userId,
    token,
    expiresAt,
    userAgent,
    ipAddress,
  });

  return session;
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; userId?: string; session?: ISession }> {
  const session = await Session.findOne({
    token,
    expiresAt: { $gt: new Date() }, // Not expired
  });

  if (!session) {
    return { valid: false };
  }

  return {
    valid: true,
    userId: session.userId,
    session,
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<boolean> {
  const result = await Session.deleteOne({ token });
  return result.deletedCount > 0;
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  const result = await Session.deleteMany({ userId });
  return result.deletedCount;
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<{ token: string; user: IUser } | null> {
  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    return null; // Don't reveal if user exists for security
  }

  const resetToken = generateToken();
  const resetTokenHash = await hashPassword(resetToken);
  
  // Token expires in 1 hour
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = expiresAt;
  await user.save();

  return {
    token: resetToken, // Return unhashed token to send via email
    user,
  };
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  // Find users with non-expired reset tokens
  const users = await User.find({
    resetPasswordExpires: { $gt: new Date() },
  });

  // Check each user's reset token
  for (const user of users) {
    if (user.resetPasswordToken) {
      const isValidToken = await comparePassword(token, user.resetPasswordToken);
      
      if (isValidToken) {
        // Hash new password
        user.password = await hashPassword(newPassword);
        
        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();
        
        // Invalidate all existing sessions for security
        await deleteAllUserSessions(user._id!.toString());
        
        return true;
      }
    }
  }

  return false;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await Session.deleteMany({
    expiresAt: { $lt: new Date() },
  });
  return result.deletedCount;
}
