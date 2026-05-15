import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, User } from '../db/postgres';
import { redisClient } from '../db/redis';
import { createJWT, authMiddleware } from '../middleware/auth';
import { updateTrustScore,terminateSession } from '../middleware/sessionTracker';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { generateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
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
    
    const mfaCheck = await db.queryOne('SELECT totp_enabled FROM users WHERE id = $1', [user.id]);
    if (mfaCheck?.totp_enabled) {
    	const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        const mfaToken = jwt.sign({ pendingMfaUserId: user.id }, JWT_SECRET, { expiresIn: '5m' });
    	console.log(`[AUTH] MFA required for user: ${user.email}`);
        
        return res.status(200).json({
            success: true,
            requiresMFA: true,
            mfaToken,
            message: 'Please enter your 6-digit Authenticator code',
        });
    }

    // 4. Create session ID
    const sessionId = uuidv4();

    // Determine initial trust score
    let initialTrustScore = 90;
    const historicalTrustScoreParts = await redisClient.get(`user:${user.id}:historical_trust_score`);
    if (historicalTrustScoreParts) {
       const historicalScoreMatch = historicalTrustScoreParts.match(/^\s*(-?\d+(\.\d+)?)\s*$/);
       if(historicalScoreMatch && !Number.isNaN(Number(historicalScoreMatch[1]))) {
          initialTrustScore = Number(historicalScoreMatch[1]);
       }
    }


    // 5. Store session in PostgreSQL
    await db.execute(
      'INSERT INTO sessions (user_id, session_id, trust_score) VALUES ($1, $2, $3)',
      [user.id, sessionId, initialTrustScore] // Use inherited or default score
    );

    // 6. Initialize session in Redis
    await redisClient.set(`session:${sessionId}:trust_score`, String(initialTrustScore), 86400); // 24 hours
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
      trustScore: initialTrustScore,
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
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
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
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
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

router.post('/webauthn/register-options', authMiddleware, async(req,res) => {
	try {
		const user = (req as any).user;
		const userId= user?.userId;
		const result = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    		const userEmail = result.rows[0]?.email;

		
		const options = await generateRegistrationOptions({
			rpName: 'Zero Trust System',
			rpID: 'localhost',
			userID: Buffer.from(userId.toString()),
			userName: userEmail,
			attestationType: 'none',
			authenticatorSelection: {
				userVerification: 'preferred',
				residentKey: 'preferred',
			},
		});
		
		//Save challege in redis for 5 minutes
		await redisClient.set(`challenge:${userId}`, options.challenge, 300);
		res.json(options);
	} catch (error) {
		console.error('Registration options error:',error);
		res.status(500).json({ error: 'Failed to generate registration options' });
	}
})

router.post('/webauthn/register-verify', authMiddleware, async(req,res) => {
	try {
		const { credential } = req.body;
		const userId= (req as any).user.userId;
		const expectedChallenge = await redisClient.get(`challenge:${userId}`);
		if (!expectedChallenge) {
		  return res.status(400).json({ error: 'Challenge expired or not found' });
		}

		const verification = await verifyRegistrationResponse({
		  response: credential,
		  expectedChallenge,
		  expectedOrigin: 'http://localhost:3001', 
		  expectedRPID: 'localhost',
		  requireUserVerification: false,
		});

		if (verification.verified && verification.registrationInfo) {
		  const { id, publicKey } = verification.registrationInfo.credential;

		  // Save the biometric credential to PostgreSQL
		  await db.query(`
		    INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
		    VALUES ($1, $2, $3, $4)
		  `, [
		    userId, 
		    Buffer.from(id).toString('base64'), 
		    Buffer.from(publicKey).toString('base64'),
		    0
		  ]);

		  // Clean up challenge
		  await redisClient.del(`challenge:${userId}`);

		  res.json({ success: true });
		} else {
		  res.status(400).json({ error: 'Verification failed' });
		}
	  } catch (error) {
		console.error('Registration verify error:', error);
		res.status(500).json({ error: 'Failed to verify registration' });
	  }
});

router.post('/webauthn/step-up-options', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    
    const credentials = await db.queryMany(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1', 
      [user.userId]
    );

    if (!credentials || credentials.length === 0) {
      return res.status(400).json({ error: 'No biometric credentials registered' });
    }

    const options = await generateAuthenticationOptions({
      rpID: 'localhost',
      userVerification: 'preferred',
      allowCredentials: credentials.map(cred => ({
        id: Buffer.from(cred.credential_id, 'base64').toString('base64url'),
        transports: ['internal', 'usb', 'ble', 'nfc'],
      })),
    });
    await redisClient.set(`challenge:${user.userId}`, options.challenge, 300);

    res.json(options);
  } catch (error) {
    console.error('Step-up options error:', error);
    res.status(500).json({ error: 'Failed to generate step-up options' });
  }
});

router.post('/webauthn/step-up-verify', authMiddleware, async (req, res) => {
  try {
    const { credential } = req.body;
    const user = (req as any).user;
    const sessionId = (req as any).sessionId;

    const expectedChallenge = await redisClient.get(`challenge:${user.userId}`);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Challenge expired' });
    }
    
    let standardizedCredId;
    try {
    	standardizedCredId = Buffer.from(credential.id, 'base64url').toString('base64');
    } catch(e) {
    	const base64 = credential.id.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
        standardizedCredId = base64 + pad;
    }
    const savedCred = await db.queryOne(
      'SELECT public_key, counter FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2',
      [user.userId, Buffer.from(credential.id, 'base64').toString('base64')] 
    );

    if (!savedCred) {
      return res.status(400).json({ error: 'Credential not recognized' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: 'http://localhost:3001',
      expectedRPID: 'localhost',
      requireUserVerification: false,
      credential: {
        id: credential.id,
        publicKey: Buffer.from(savedCred.public_key, 'base64'),
        counter: savedCred.counter,
      },
    });

    if (verification.verified) {
      const currentScoreStr = await redisClient.get(`session:${sessionId}:trust_score`);
      const currentScore = currentScoreStr ? parseInt(currentScoreStr) : 0;
      
      const newScore = Math.min(100, currentScore + 30);
      
      await redisClient.set(`session:${sessionId}:trust_score`, newScore.toString(), 86400);
      await redisClient.del(`challenge:${user.userId}`); // cleanup

      await db.execute(
        'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
        [verification.authenticationInfo.newCounter, Buffer.from(credential.id, 'base64').toString('base64')]
      );

      return res.json({ success: true, newScore });
    } else {
      // Failed biometric = strong evidence of compromised session → terminate
      console.log(`[SECURITY] Step-up verification FAILED for session ${sessionId} — terminating session`);
      await terminateSession(sessionId);
      return res.status(403).json({ error: 'Verification failed. Session terminated for security.' });
    }
  } catch (error) {
    console.error('Step-up verify error:', error);
    // On unexpected error during verification, also terminate as precaution
    const sessionId = (req as any).sessionId;
    if (sessionId) await terminateSession(sessionId);
    res.status(500).json({ error: 'Verification process failed. Session terminated.' });
  }
});

router.post('/totp/setup', authMiddleware, async (req, res) => {
	try {
		const userId= (req as any).user.userId;
		const user = await db.queryOne('SELECT email FROM users WHERE id = $1', [userId]);
		const secret = generateSecret();
		
		const otpauthUrl = generateURI({
		  issuer: 'ZeroTrust System',
		  label: user.email,
		  secret
		});
		const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
		
		await db.execute(
			'UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, userId]
		);
		
		res.json({ secret, qrCodeUrl });
	} catch (error) {
		console.error('TOTP setup error:', error);
		res.status(500).json({ error: 'Failed to generate TOTP setup' });
	}
});

router.post('/totp/verify-setup', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;

    const user = await db.queryOne('SELECT totp_secret FROM users WHERE id = $1', [userId]);

    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'TOTP setup not initiated' });
    }

    const verification = await verify({ token, secret: user.totp_secret });

    if (verification.valid) {
      await db.execute('UPDATE users SET totp_enabled = true WHERE id = $1', [userId]);
      res.json({ success: true, message: 'TOTP Authenticator enabled successfully!' });
    } else {
      res.status(400).json({ error: 'Invalid verification code. Try again.' });
    }
  } catch (error) {
    console.error('TOTP verify setup error:', error);
    res.status(500).json({ error: 'Failed to verify TOTP setup' });
  }
});
 
router.post('/login/mfa', async (req: Request, res: Response) => {
  try {
    const { mfaToken, code } = req.body;
    if (!mfaToken || !code) {
      return res.status(400).json({ error: 'Missing token or code' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    
    const decoded = jwt.verify(mfaToken, JWT_SECRET) as any;
    if (!decoded.pendingMfaUserId) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const user = await db.queryOne('SELECT id, email, totp_secret FROM users WHERE id = $1', [decoded.pendingMfaUserId]);
    
    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'MFA not configured for this user' });
    }

	const isValid = verify({ token: code, secret: user.totp_secret });
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 6-digit code. Please try again.' });
    }

    const sessionId = uuidv4();
    let initialTrustScore = 90;
    
    const historicalTrustScoreParts = await redisClient.get(`user:${user.id}:historical_trust_score`);
    if (historicalTrustScoreParts) {
       const historicalScoreMatch = historicalTrustScoreParts.match(/^\s*(-?\d+(\.\d+)?)\s*$/);
       if(historicalScoreMatch && !Number.isNaN(Number(historicalScoreMatch[1]))) {
          initialTrustScore = Number(historicalScoreMatch[1]);
       }
    }

    await db.execute(
      'INSERT INTO sessions (user_id, session_id, trust_score) VALUES ($1, $2, $3)',
      [user.id, sessionId, initialTrustScore]
    );

    await redisClient.set(`session:${sessionId}:trust_score`, String(initialTrustScore), 86400);
    await redisClient.set(`session:${sessionId}:user_id`, user.id.toString(), 86400);

    const token = createJWT({ userId: user.id, sessionId });

    console.log(`[AUTH] User logged in securely with MFA: ${user.email} (Session: ${sessionId})`);

    res.status(200).json({
      success: true,
      token,
      userId: user.id,
      email: user.email,
      sessionId,
      trustScore: initialTrustScore,
      message: 'MFA Verified. Login successful',
    });
  } catch (error) {
    console.error('MFA Login error:', error);
    res.status(401).json({ error: 'MFA failed', message: 'Invalid or expired MFA session' });
  }
});

export default router;
