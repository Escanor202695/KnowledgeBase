import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../lib/auth';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
      session?: {
        token: string;
      };
    }
  }
}

/**
 * Middleware to check if user is authenticated
 * TODO: Implement authentication check
 * 
 * This middleware should:
 * 1. Extract token from Authorization header or cookies
 * 2. Validate the token using validateSession()
 * 3. If valid, attach user info to req.user
 * 4. If invalid, return 401 Unauthorized
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // TODO: Implement authentication middleware
  // Example implementation:
  // const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.sessionToken;
  // if (!token) return res.status(401).json({ error: 'Not authenticated' });
  // const { valid, userId } = await validateSession(token);
  // if (!valid) return res.status(401).json({ error: 'Invalid or expired session' });
  // const user = await User.findById(userId);
  // if (!user) return res.status(401).json({ error: 'User not found' });
  // req.user = { id: user._id.toString(), email: user.email, name: user.name };
  // req.session = { token };
  // next();
  
  res.status(401).json({ error: 'Authentication not implemented' });
}

/**
 * Optional auth middleware - doesn't fail if not authenticated
 * TODO: Implement optional authentication
 * 
 * This middleware should:
 * 1. Try to validate token if present
 * 2. Attach user info if valid
 * 3. Continue regardless of authentication status
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // TODO: Implement optional authentication middleware
  // Similar to requireAuth but doesn't return 401 if not authenticated
  
  next();
}
