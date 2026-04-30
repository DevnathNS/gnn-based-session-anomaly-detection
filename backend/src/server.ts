import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import apiRouter from './routes/api';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { sessionTrackerMiddleware, getSessionHistory, updateTrustScore } from './middleware/sessionTracker';
import { policyEnforcerMiddleware, getPolicies } from './middleware/policyEnforcer';
import { initializeDatabase } from './db/postgres';
import { logger } from './middleware/logger';
import { fingerprintChecker } from './middleware/fingerprintChecker';

const PORT=3000;

const app = express();
app.use(cors({
  origin: 'http://localhost:3001', // Your React app's port
  credentials: true
}));

app.use(express.json());

// Health check - public
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Swagger docs - public
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Auth routes - public (no authentication needed)
// POST /auth/register - Register new user
// POST /auth/login - Login and get JWT token
// POST /auth/logout - Logout (requires JWT)
// GET /auth/me - Get current user (requires JWT)
app.use('/auth', authRouter);

// Public endpoints - no authentication required
// These run BEFORE auth middleware, so they don't need a token
app.use('/api/public', apiRouter);

// Protected endpoints - require authentication
// Middleware chain:
// 1. authMiddleware → Verify JWT
// 2. sessionTrackerMiddleware → Track request, init score
// 3. policyEnforcerMiddleware → Check access policy
// 4. apiRouter → Actual routes

app.use(
  '/api',
  authMiddleware,
  sessionTrackerMiddleware,
  fingerprintChecker,
  policyEnforcerMiddleware,
  logger,
  apiRouter
);

// Debug endpoints (for testing/development)
if (process.env.NODE_ENV !== 'production') {
  // Get current session data
  app.get('/debug/session', authMiddleware, async (req, res) => {
    const sessionId = req.sessionId;
    if (!sessionId) {
      return res.status(401).json({ error: 'No session' });
    }

    const history = await getSessionHistory(sessionId);
    res.json({
      sessionId,
      ...history,
    });
  });

  // View all policy rules
  app.get('/debug/policies', (req, res) => {
    res.json({ policies: getPolicies() });
  });

  // Manual score adjustment (for testing)
  app.post('/debug/score/:sessionId/:score', (req, res) => {
    const { sessionId, score } = req.params;
    const newScore = parseInt(score);

    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      return res.status(400).json({ error: 'Score must be 0-100' });
    }

    updateTrustScore(sessionId, newScore).then((success) => {
      res.json({
        success,
        message: success ? `Score set to ${newScore}` : 'Failed to set score',
      });
    });
  });

  console.log('[DEBUG] Debug endpoints enabled:');
  console.log('  GET  /debug/session');
  console.log('  GET  /debug/policies');
  console.log('  POST /debug/score/:sessionId/:score');
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start server
const startServer = async () => {
  try {
    // 1. Initialize database
    console.log('\n🗄️  Connecting to databases...\n');
    await initializeDatabase();

    // 2. Start listening
    app.listen(PORT, () => {
      console.log(`\n╔════════════════════════════════════════════════════════╗`);
      console.log(`║        ADAPTIVE TRUST SESSION MANAGEMENT SYSTEM         ║`);
      console.log(`╚════════════════════════════════════════════════════════╝`);
      console.log(`\n✓ Server running at http://localhost:${PORT}`);
      console.log(`✓ Swagger docs at http://localhost:${PORT}/docs`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📚 API Routes:`);
      console.log(`  Public (no auth):`);
      console.log(`    POST   /auth/register                    - Register new user`);
      console.log(`    POST   /auth/login                       - Login and get JWT`);
      console.log(`    GET    /api/public/*                     - Public endpoints`);
      console.log(`\n  Protected (require JWT):`);
      console.log(`    POST   /auth/logout                      - Logout`);
      console.log(`    GET    /auth/me                          - Get current user`);
      console.log(`    GET    /api/user/*                       - User endpoints (score ≥50)`);
      console.log(`    GET    /api/admin/*                      - Admin endpoints (score ≥85)`);
      console.log(`    POST   /api/payments/*                   - Payments (score ≥90)`);
      console.log(`\n🔧 Debug (development only):`);
      console.log(`    GET    /debug/session                    - Get session data`);
      console.log(`    GET    /debug/policies                   - Get policy rules`);
      console.log(`    POST   /debug/score/:sessionId/:score    - Manual score adjustment`);
      console.log(`\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
