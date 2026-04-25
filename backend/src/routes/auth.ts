import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, User } from '../db/postgres';
import { redisClient } from '../db/redis';
import { createJWT } from '../middleware/auth';
import { terminateSession } from '../middleware/sessionTracker';

const router = Router();

/**
 * User registration
 * POST /auth/register
 *
 * Request body:
 * {
 *   email: "user@example.com",
 *   password: "password123"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   userId: 123,
 *   email: "user@example.com"
 * }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password too short',
        message: 'Password must be at least 8 characters',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // 2. Check if user already exists
    const existingUser = await db.queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists',
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Store user in database
    const result = await db.queryOne<User>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash]
    );

    if (!result) {
      return res.status(500).json({
        error: 'Registration failed',
        message: 'Could not create user account',
      });
    }

    console.log(`[AUTH] User registered: ${email} (ID: ${result.id})`);

    // 5. Return success
    res.status(201).json({
      success: true,
      userId: result.id,
      email: result.email,
      message: 'Registration successful. You can now login.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration',
    });
  }
});

/**
 * User login
 * POST /auth/login
 *
 * Request body:
 * {
 *   email: "user@example.com",
 *   password: "password123"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   token: "eyJhbGciOiJIUzI1NiIs...",
 *   userId: 123,
 *   email: "user@example.com"
 * }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and password are required',
      });
    }

    // 2. Find user in database
    const user = await db.queryOne<User>(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // 3. Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // 4. Create session ID
    const sessionId = uuidv4();

    // 5. Store session in PostgreSQL
    await db.execute(
      'INSERT INTO sessions (user_id, session_id, trust_score) VALUES ($1, $2, $3)',
      [user.id, sessionId, 90] // Start with 90 trust score
    );

    // 6. Initialize session in Redis
    await redisClient.set(`session:${sessionId}:trust_score`, '90', 86400); // 24 hours
    await redisClient.set(`session:${sessionId}:user_id`, user.id.toString(), 86400);

    // 7. Create JWT token
    const token = createJWT({
      userId: user.id,
      sessionId,
    });

    console.log(`[AUTH] User logged in: ${email} (Session: ${sessionId})`);

    // 8. Return token
    res.status(200).json({
      success: true,
      token,
      userId: user.id,
      email: user.email,
      sessionId,
      trustScore: 90,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login',
    });
  }
});

/**
 * User logout
 * POST /auth/logout
 *
 * Requires: Authorization header with valid JWT
 *
 * Response:
 * {
 *   success: true,
 *   message: "Logged out successfully"
 * }
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionId = (req as any).sessionId;

    // If no session, still return success
    if (!sessionId) {
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    }

    // 1. Mark session as ended in PostgreSQL
    await db.execute('UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE session_id = $1', [
      sessionId,
    ]);

    // 2. Clear session from Redis
    await terminateSession(sessionId);

    console.log(`[AUTH] User logged out: Session ${sessionId}`);

    // 3. Return success
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - user is logged out
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
});

/**
 * Get current user info
 * GET /auth/me
 *
 * Requires: Authorization header with valid JWT
 *
 * Response:
 * {
 *   userId: 123,
 *   email: "user@example.com",
 *   createdAt: "2024-01-15T10:30:00Z"
 * }
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid session',
      });
    }

    // Get user from database
    const user = await db.queryOne<User>(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The user associated with this token does not exist',
      });
    }

    res.status(200).json({
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred',
    });
  }
});

export default router;
