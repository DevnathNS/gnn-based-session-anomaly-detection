import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';

/**
 * Session Request Record
 * Stored in Redis for each request
 */
interface SessionRequest {
  endpoint: string;
  method: string;
  ip: string;
  userAgent?: string;
  timestamp: number;
  device?: string;
}

interface SessionGraph {
  nodes: {
    id: string;              // e.g., "/api/user/profile"
    sensitivity: number;     // 0=public, 1=user, 2=admin, 3=critical
    accessCount: number;     // How many times accessed
    lastAccessed: number;    // Timestamp
  }[];
  
  edges: {
    from: string;            // e.g., "/api/dashboard"
    to: string;              // e.g., "/api/profile"
    timeDelta: number;       // Milliseconds between accesses
    method: string;          // GET, POST, etc.
  }[];
}

function getSensitivity(endpoint: string): number {
  if (endpoint.startsWith('/api/public')) return 0;
  if (endpoint.startsWith('/api/user')) return 1;
  if (endpoint.startsWith('/api/admin')) return 2;
  if (endpoint.startsWith('/api/payment') || endpoint.startsWith('/api/data')) return 3;
  return 0;
}

export async function updateSessionGraph(req: Request, sessionId: string) {
  try {
    let graphStr = await redisClient.get(`session:${sessionId}:graph`);
    let graph: SessionGraph = graphStr ? JSON.parse(graphStr) : { nodes: [], edges: [] };
    
    const currentEndpoint = req.path;
    
    let node = graph.nodes.find(n => n.id === currentEndpoint);
    if (!node) {
      node = {
        id: currentEndpoint,
        sensitivity: getSensitivity(currentEndpoint),
        accessCount: 0,
        lastAccessed: Date.now()
      };
      graph.nodes.push(node);
    }
    node.accessCount++;
    node.lastAccessed = Date.now();
    
    const lastEndpoint = await redisClient.get(`session:${sessionId}:last_endpoint`);
    if (lastEndpoint && lastEndpoint !== currentEndpoint) {
      graph.edges.push({
        from: lastEndpoint,
        to: currentEndpoint,
        timeDelta: Date.now() - node.lastAccessed,
        method: req.method
      });
    }
    
    await redisClient.set(`session:${sessionId}:graph`, JSON.stringify(graph), 86400);
  } catch (error) {
    console.error('Session graph update error:', error);
  }
}

/**
 * Session Tracking Middleware
 *
 * Records every request in Redis:
 * - Request history (for building session graphs)
 * - Rate limiting counter (requests per minute)
 * - Last endpoint visited (for graph edges)
 * - Initialize default trust score if new session
 * 
 * Skips public endpoints that don't require session tracking
 *
 * Usage:
 *   app.use('/api/*', authMiddleware, sessionTrackerMiddleware);
 */
export async function sessionTrackerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  
) {
  (req as any).signals = {}; 
  try {
    // Skip session tracking for public endpoints
    if (req.path.startsWith('/public/')) {
      return next();
    }

    // 1. Get sessionId (set by auth middleware)
    const sessionId = req.sessionId;
    if (!sessionId) {
      return res.status(401).json({
        error: 'Missing session',
        message: 'Session ID not found. Auth middleware must run first.',
      });
    }

    // 2. Extract request metadata
    const endpoint = req.path;
    const method = req.method;
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const device = req.headers['x-device-fingerprint'] as string | undefined;
    const timestamp = Date.now();

    // 3. Create request record
    const requestRecord: SessionRequest = {
      endpoint,
      method,
      ip,
      userAgent,
      timestamp,
      device,
    };

    // 4. Store request in Redis history (max last 100 requests)
    // Key: session:{sessionId}:history
    // Structure: List of JSON objects
    const historyKey = `session:${sessionId}:history`;
    await redisClient.lpushJSON(historyKey, requestRecord);

    // Keep only last 100 requests
    const historyLength = await redisClient.lrange(historyKey, 0, -1);
    if (historyLength.length > 100) {
      // Trim to 100 items
      const client = redisClient.getClient();
      await client.lTrim(historyKey, 0, 99);
    }

    // 5. Expire history after 24 hours of inactivity
    await redisClient.expire(historyKey, 86400); // 24 hours

    // 6. Increment rate counter (requests per minute)
    // Key: session:{sessionId}:rate_limit
    const rateKey = `session:${sessionId}:rate_limit`;
    const currentRate = await redisClient.incr(rateKey);

    // Reset rate counter every 60 seconds
    if (currentRate === 1) {
      // First request in this minute window
      await redisClient.expire(rateKey, 60);
    }
    
    (req as any).signals = { ...(req as any).signals, high_rate:currentRate > 100, request_rate: currentRate };

    // 7. Store last endpoint (for building graph edges)
    // Key: session:{sessionId}:last_endpoint
    const lastEndpointKey = `session:${sessionId}:last_endpoint`;
    await redisClient.set(lastEndpointKey, endpoint, 86400); // 24h expiry

    // 8. Initialize default trust score if session is new
    // Key: session:{sessionId}:trust_score
    const scoreKey = `session:${sessionId}:trust_score`;
    const hasScore = await redisClient.exists(scoreKey);

    if (!hasScore) {
      // New session - initialize with default score
      await redisClient.set(scoreKey, '90', 86400); // 90 points, 24h expiry
      console.log(`[SESSION] New session created: ${sessionId}, initial score: 90`);
    }
    
    const hour = new Date().getUTCHours();
    (req as any).signals = { ...(req as any).signals, is_after_hours: hour < 6 || hour > 22 };
    
    // 8.5 Update Dynamic Session Graph 
    await updateSessionGraph(req, sessionId);

    // 9. Attach rate limit to request for later use
    (req as any).sessionData = {
      sessionId,
      rateLimit: currentRate,
      trustScore: hasScore
        ? parseInt(await redisClient.get(scoreKey) || '90')
        : 90,
    };

    // 10. Log for audit
    const sessionData = (req as any).sessionData;
    console.log(
      `[TRACK] ${method} ${endpoint} | Rate: ${sessionData.rateLimit}/min | Score: ${sessionData.trustScore}`
    );

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Session tracking error:', error);
    res.status(500).json({
      error: 'Session tracking failed',
      message: 'An error occurred while tracking the session',
    });
  }
}

/**
 * Get session history
 * Helper function to retrieve session data
 *
 * Usage:
 *   const history = await getSessionHistory(sessionId);
 */
export async function getSessionHistory(sessionId: string) {
  try {
    const historyKey = `session:${sessionId}:history`;
    const history = await redisClient.lrangeJSON<SessionRequest>(
      historyKey,
      0,
      99
    );

    const rateKey = `session:${sessionId}:rate_limit`;
    const rate = await redisClient.get(rateKey);

    const scoreKey = `session:${sessionId}:trust_score`;
    const score = await redisClient.get(scoreKey);

    return {
      sessionId,
      history,
      currentRate: rate ? parseInt(rate) : 0,
      trustScore: score ? parseInt(score) : 0,
    };
  } catch (error) {
    console.error('Error getting session history:', error);
    return null;
  }
}

/**
 * Update trust score for a session
 * Used by trust engine to update scores
 *
 * Usage:
 *   await updateTrustScore(sessionId, 75);
 */
export async function updateTrustScore(
  sessionId: string,
  newScore: number
): Promise<boolean> {
  try {
    const scoreKey = `session:${sessionId}:trust_score`;
    const clampedScore = Math.max(0, Math.min(100, newScore)); // 0-100 range

    await redisClient.set(scoreKey, clampedScore.toString(), 86400);

    // Also update historical trust score for the user to fix the vulnerability
    const userId = await redisClient.get(`session:${sessionId}:user_id`);
    if (userId) {
       await redisClient.set(`user:${userId}:historical_trust_score`, clampedScore.toString());
    }

    console.log(
      `[SCORE] Session ${sessionId} score updated to ${clampedScore}`
    );
    return true;
  } catch (error) {
    console.error('Error updating trust score:', error);
    return false;
  }
}

/**
 * Terminate a session (for security/logout)
 * Clears all session data from Redis
 *
 * Usage:
 *   await terminateSession(sessionId);
 */
export async function terminateSession(sessionId: string): Promise<boolean> {
  try {
    await redisClient.del(`session:${sessionId}:history`);
    await redisClient.del(`session:${sessionId}:rate_limit`);
    await redisClient.del(`session:${sessionId}:trust_score`);
    await redisClient.del(`session:${sessionId}:last_endpoint`);
    await redisClient.del(`session:${sessionId}:graph`);
    console.log(`[SESSION] Session terminated: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('Error terminating session:', error);
    return false;
  }
}
