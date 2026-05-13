import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define what data is inside the JWT token
interface JWTPayload {
  userId: number;
  sessionId: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      sessionId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * Authentication Middleware
 * 
 * Verifies JWT token from Authorization header
 * Extracts userId and sessionId
 * Attaches to req.user
 * 
 * Skips public endpoints that don't require authentication
 * 
 * Usage:
 *   app.use('/api/*', authMiddleware);
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip authentication for public endpoints
    if (req.path.startsWith('/public/')) {
      return next();
    }
    

    // 1. Get token from Authorization header
    // Expected format: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing authorization header',
        message: 'Please provide token in Authorization header',
      });
    }

    // 2. Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization header format',
        message: 'Expected format: "Bearer <token>"',
      });
    }

    const token = parts[1];

    // 3. Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Check if session was terminated in Redis
    if (decoded.sessionId) {
      const { redisClient } = await import('../db/redis');
      const scoreKey = `session:${decoded.sessionId}:trust_score`;
      const hasScore = await redisClient.exists(scoreKey);
      if (!hasScore) {
        return res.status(401).json({
          error: 'Session terminated',
          message: 'Your session is invalid or has expired. Please login again.',
        });
      }
    }

    // 4. Attach to request object
    req.user = decoded;
    req.sessionId = decoded.sessionId;

    // 5. Continue to next middleware/route
    next();
  } catch (error) {
    // Handle JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid',
      });
    }

    // Unknown error
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An unexpected error occurred',
    });
  }
}

/**
 * Create JWT token
 * 
 * Usage:
 *   const token = createJWT({ userId: 123, sessionId: "abc123" });
 */
export function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256',
  });
  return token;
}

/**
 * Verify JWT token (for testing/debugging)
 * 
 * Usage:
 *   const payload = verifyJWT(token);
 */
export function verifyJWT(token: string): JWTPayload {
  const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
  return payload;
}
