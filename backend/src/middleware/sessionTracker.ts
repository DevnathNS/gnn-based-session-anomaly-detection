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
    timeSinceLastAccess?: number;
  }[];
  
  edges: {
    from: string;            // e.g., "/api/dashboard"
    to: string;              // e.g., "/api/profile"
    timeDelta: number;       // Milliseconds between accesses
    method: string;          // GET, POST, etc.
  }[];
}

function getSensitivity(endpoint: string): number {
  if (endpoint.includes('home-view') || endpoint.includes('pricing-view')) return 0;
  if (endpoint.startsWith('/api/public')) return 0;
  if (endpoint.startsWith('/api/user') || endpoint.startsWith('/user')) return 1;
  if (endpoint.startsWith('/api/admin') || endpoint.startsWith('/admin')) return 2;
  if (endpoint.startsWith('/api/payment') || endpoint.startsWith('/payment')) return 3;
  return 0;
}

export async function updateSessionGraph(req: Request, sessionId: string) {
  try {
    let graphStr = await redisClient.get(`session:${sessionId}:graph`);
    let graph: SessionGraph = graphStr ? JSON.parse(graphStr) : { nodes: [], edges: [] };
    
    const currentEndpoint = req.originalUrl.split('?')[0]; // Better tracking with base url mapping
    
    let node = graph.nodes.find(n => n.id === currentEndpoint);
    if (!node) {
      node = {
        id: currentEndpoint,
        sensitivity: getSensitivity(currentEndpoint),
        accessCount: 0,
        lastAccessed: Date.now(),
        timeSinceLastAccess: 0
      };
      graph.nodes.push(node);
    } else {
      node.timeSinceLastAccess = Date.now() - node.lastAccessed;
    }
    
    node.accessCount++;
    node.lastAccessed = Date.now();
    
    // Use the tracker we safely pulled out before writing
    const lastEndpoint = (req as any).previousEndpointTracking; 
    const previousAccessTime = (req as any).previousAccessTime || Date.now();
    if (lastEndpoint && lastEndpoint !== currentEndpoint) {
      graph.edges.push({
        from: lastEndpoint,
        to: currentEndpoint,
        timeDelta: Date.now() - previousAccessTime,
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
 
 const IGNORED_ROUTES = [
 	'/api/session/graph',
 	'/api/auth/webauthn/step-up-options',
  	'/api/auth/webauthn/step-up-verify'
 ]
export async function sessionTrackerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
  
) {
  (req as any).signals = {}; 
  try {
    const endpoint = req.originalUrl.split('?')[0];

    // 1. Escape Hatch: Skip background graph polling immediately
    if (IGNORED_ROUTES.includes(endpoint)) {
      return next(); 
    }

    // 2. Escape Hatch: Safely get Session ID. 
    // If none exists (e.g., an unauthenticated user on the Home page), skip tracking.
    const sessionId = req.sessionId;
    if (!sessionId) {
      return next();
    }

    // 3. Extract request metadata
    const method = req.method;
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const device = req.headers['x-device-fingerprint'] as string | undefined;
    const timestamp = Date.now();

    // 4. Create request record
    const requestRecord = { endpoint, method, ip, userAgent, timestamp, device };

    // 5. Store request in Redis history (max 100)
    const historyKey = `session:${sessionId}:history`;
    await redisClient.lpushJSON(historyKey, requestRecord);

    const historyLength = await redisClient.lrange(historyKey, 0, -1);
    if (historyLength.length > 100) {
      const client = redisClient.getClient();
      await client.lTrim(historyKey, 0, 99);
    }
    await redisClient.expire(historyKey, 86400);

    // 6. Rate limit counter
    const rateKey = `session:${sessionId}:rate_limit`;
    const currentRate = await redisClient.incr(rateKey);
    if (currentRate === 1) {
      await redisClient.expire(rateKey, 60);
    }

    (req as any).signals = { 
        ...(req as any).signals, 
        high_rate: currentRate > 100, 
        request_rate: currentRate 
    };

    // 7. Track endpoints for the graph edges
    const lastEndpointKey = `session:${sessionId}:last_endpoint`;
    const previousTargetTracking = await redisClient.get(lastEndpointKey);
    (req as any).previousEndpointTracking = previousTargetTracking;

    const lastAccessTimeKey = `session:${sessionId}:last_access_time`;
    const previousAccessTimeStr = await redisClient.get(lastAccessTimeKey);
    (req as any).previousAccessTime = previousAccessTimeStr ? parseInt(previousAccessTimeStr) : Date.now();

    await redisClient.set(lastEndpointKey, endpoint, 86400);
    await redisClient.set(lastAccessTimeKey, Date.now().toString(), 86400);

    // 8. Initialize default trust score if new session
    const scoreKey = `session:${sessionId}:trust_score`;
    const hasScore = await redisClient.exists(scoreKey);
    if (!hasScore) {
      await redisClient.set(scoreKey, '90', 86400);
    }

    const hour = new Date().getUTCHours();
    (req as any).signals = { 
        ...(req as any).signals, 
        is_after_hours: hour < 6 || hour > 22 
    };

    // 9. Update the Session Graph! (This will now safely catch Public & Private pages)
    await updateSessionGraph(req, sessionId);

    // 10. Attach final data for logger
    (req as any).sessionData = {
      sessionId,
      rateLimit: currentRate,
      trustScore: hasScore ? parseInt(await redisClient.get(scoreKey) || '90') : 90,
    };

    // 🚨 ONLY CALL NEXT() ONCE, RIGHT HERE AT THE END 🚨
    return next(); 

  } catch (error) {
    console.error('Session tracking error:', error);
    return res.status(500).json({
      error: 'Session tracking failed',
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
