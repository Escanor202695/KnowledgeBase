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
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate session token
    const { valid, userId } = await validateSession(token);

    if (!valid || !userId) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Fetch user from database
    const { User } = await import('../lib/models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request object
    req.user = {
      id: user._id!.toString(),
      email: user.email,
      name: user.name,
    };
    req.session = { token };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without auth
    }

    const token = authHeader.substring(7);
    const { valid, userId } = await validateSession(token);

    if (valid && userId) {
      const { User } = await import('../lib/models/User');
      const user = await User.findById(userId);
      
      if (user) {
        req.user = {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
        };
        req.session = { token };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
}
