import { Router, Request, Response } from 'express';
import { User } from '../lib/models/User';
import UserPreferences from '../lib/models/UserPreferences';
import { 
  hashPassword, 
  comparePassword, 
  createSession, 
  deleteSession,
  deleteAllUserSessions,
  generatePasswordResetToken,
  resetPassword 
} from '../lib/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/signup
 * Create a new user account
 * TODO: Implement user registration
 * 
 * Expected request body:
 * {
 *   email: string,
 *   password: string,
 *   name?: string
 * }
 * 
 * Implementation steps:
 * 1. Validate input (email format, password strength)
 * 2. Check if email already exists
 * 3. Hash the password
 * 4. Create user in database
 * 5. Create session token
 * 6. Return user info and token
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength (at least 8 chars)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || undefined,
    });

    // Create session
    const session = await createSession(
      user._id!.toString(),
      req.headers['user-agent'],
      req.ip
    );

    // Return user info and token (don't send password)
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      token: session.token,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 * TODO: Implement user login
 * 
 * Expected request body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Implementation steps:
 * 1. Validate input
 * 2. Find user by email
 * 3. Compare password with hashed password
 * 4. Create session token
 * 5. Return user info and token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session
    const session = await createSession(
      user._id!.toString(),
      req.headers['user-agent'],
      req.ip
    );

    // Return user info and token
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      token: session.token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Delete current session
 * TODO: Implement logout
 * 
 * Implementation steps:
 * 1. Extract token from request
 * 2. Delete session from database
 * 3. Return success
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Delete session
    await deleteSession(token);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout-all
 * Delete all sessions for current user
 * TODO: Implement logout from all devices
 * 
 * Implementation steps:
 * 1. Get user ID from req.user
 * 2. Delete all sessions for this user
 * 3. Return success with count
 */
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Implement logout-all logic
    res.status(501).json({ error: 'Logout all not implemented yet' });
  } catch (error: any) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Generate password reset token and send email
 * TODO: Implement forgot password
 * 
 * Expected request body:
 * {
 *   email: string
 * }
 * 
 * Implementation steps:
 * 1. Validate email
 * 2. Find user by email
 * 3. Generate reset token
 * 4. Send reset email (you'll need to implement email service)
 * 5. Return success (don't reveal if email exists for security)
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate reset token
    const result = await generatePasswordResetToken(email);

    // Always return success to prevent email enumeration
    // In production, you would send an email with the reset link here
    // For development, we'll include the reset link in the response
    if (result) {
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${result.token}`;
      console.log('Password reset token for', email, ':', result.token);
      console.log('Reset link:', resetLink);
      
      // In development, return the reset link so users can test it
      // In production, you would send this via email instead
      return res.status(200).json({
        message: 'If an account exists with this email, you will receive password reset instructions.',
        resetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
      });
    }

    res.status(200).json({
      message: 'If an account exists with this email, you will receive password reset instructions.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 * TODO: Implement password reset
 * 
 * Expected request body:
 * {
 *   token: string,
 *   newPassword: string
 * }
 * 
 * Implementation steps:
 * 1. Validate token and new password
 * 2. Find user by reset token
 * 3. Check if token is not expired
 * 4. Hash new password
 * 5. Update user password
 * 6. Clear reset token
 * 7. Invalidate all existing sessions
 * 8. Return success
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Reset password using token
    const success = await resetPassword(token, newPassword);

    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.status(200).json({
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 * TODO: Implement get current user
 * 
 * Implementation steps:
 * 1. Return user info from req.user (set by requireAuth middleware)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // User is already attached to req by requireAuth middleware
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/auth/update-profile
 * Update user profile
 * TODO: Implement profile update
 * 
 * Expected request body:
 * {
 *   name?: string,
 *   email?: string
 * }
 * 
 * Implementation steps:
 * 1. Get user ID from req.user
 * 2. Validate new data
 * 3. If email is changing, check if new email is available
 * 4. Update user document
 * 5. Return updated user info
 */
router.patch('/update-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Implement update profile logic
    res.status(501).json({ error: 'Update profile not implemented yet' });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 * TODO: Implement password change
 * 
 * Expected request body:
 * {
 *   currentPassword: string,
 *   newPassword: string
 * }
 * 
 * Implementation steps:
 * 1. Get user ID from req.user
 * 2. Find user and verify current password
 * 3. Hash new password
 * 4. Update user password
 * 5. Invalidate all sessions except current one
 * 6. Return success
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Implement change password logic
    res.status(501).json({ error: 'Change password not implemented yet' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/preferences
 * Get user AI preferences
 */
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let preferences = await UserPreferences.findOne({ userId });
    
    // If no preferences exist, return defaults
    if (!preferences) {
      preferences = {
        userId,
        temperature: 0.7,
        maxTokens: 8192,
        model: 'gpt-3.5-turbo',
        defaultSystemPrompt: undefined,
      } as any;
    }

    return res.json({
      preferences: {
        defaultSystemPrompt: preferences.defaultSystemPrompt || null,
        temperature: preferences.temperature,
        maxTokens: preferences.maxTokens,
        model: preferences.model,
      },
    });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/auth/preferences
 * Update user AI preferences
 */
router.patch('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { defaultSystemPrompt, temperature, maxTokens, model } = req.body;

    // Validate temperature
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
    }

    // Validate maxTokens
    if (maxTokens !== undefined && (maxTokens < 1000 || maxTokens > 16000)) {
      return res.status(400).json({ error: 'Max tokens must be between 1000 and 16000' });
    }

    // Update or create preferences
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(defaultSystemPrompt !== undefined && { defaultSystemPrompt: defaultSystemPrompt.trim() || undefined }),
          ...(temperature !== undefined && { temperature }),
          ...(maxTokens !== undefined && { maxTokens }),
          ...(model !== undefined && { model }),
        },
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      preferences: {
        defaultSystemPrompt: preferences.defaultSystemPrompt || null,
        temperature: preferences.temperature,
        maxTokens: preferences.maxTokens,
        model: preferences.model,
      },
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
