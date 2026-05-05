import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { redisClient } from '../db/redis';

const TRUST_ENGINE_URL = 'http://localhost:8000';

export async function trustEngineMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.sessionId;
    if (!sessionId) return next();

    // Skip tracking for public endpoints
    if (req.path.startsWith('/public/')) {
        return next();
    }

    // Get signals gathered from previous middlewares
    const signals = (req as any).signals || {};
    const ip = req.ip || 'unknown';
    // Format the history slightly differently if you want, or just get from tracking
    const historyKey = `session:${sessionId}:history`;
    const rateKey = `session:${sessionId}:rate_limit`;

    const currentScore = parseInt(await redisClient.get(`session:${sessionId}:trust_score`) || '90');
    
    const prevIpKey = `session:${sessionId}:last_ip`;
    const prevLocKey = `session:${sessionId}:last_location`;
    const prevTsKey  = `session:${sessionId}:last_ip_ts`;

    const previousIp  = await redisClient.get(prevIpKey);
    const previousLoc = await redisClient.get(prevLocKey);
    const previousTs  = await redisClient.get(prevTsKey);

    const ipChanged = !!previousIp && previousIp !== ip;

    // Create the payload
    const payload = {
        session_id: sessionId,
        ip: ip,
        ip_changed: ipChanged,
        previous_ip: previousIp || ip,
        previous_location: previousLoc ? JSON.parse(previousLoc) : null,
        previous_ts: previousTs ? parseInt(previousTs) : null,
        requests_per_minute: signals.request_rate || (await redisClient.get(rateKey)) || 0,
        device_fingerprint: req.headers['x-device-fingerprint'] || 'unknown',
        device_changed: signals.device_changed || false,
        is_after_hours: signals.is_after_hours || false,
        high_rate: signals.high_rate || false,
        login_failure: false,
        recent_changes: false,
        current_score: currentScore,
        graph: JSON.parse(await redisClient.get(`session:${sessionId}:graph`) || '{}')
    };

    const start = Date.now();
    const response = await axios.post(`${TRUST_ENGINE_URL}/calculate_score`, payload);
    const latency = Date.now() - start;
    console.log(`[TRUST_ENGINE] Evaluated session ${sessionId} in ${latency}ms`);
    
    if (response.data && response.data.final_score !== undefined) {
        let newScore = response.data.final_score;
        
        await redisClient.set(prevIpKey, ip, 86400);
        if (response.data.current_location) {
            await redisClient.set(prevLocKey, JSON.stringify(response.data.current_location), 86400);
        }
        await redisClient.set(prevTsKey, Date.now().toString(), 86400);
        
        // Caching optimization: Only update if the score differs, or at intervals (We just update redis directly to emulate cache)
        if(newScore !== currentScore) {
          // ensure clamped
          newScore = Math.max(0, Math.min(100, newScore));
          
          await redisClient.set(`session:${sessionId}:trust_score`, newScore.toString(), 86400);
          
          const userId = await redisClient.get(`session:${sessionId}:user_id`);
          if (userId) {
              await redisClient.set(`user:${userId}:historical_trust_score`, newScore.toString());
          }
          console.log(`[TRUST_ENGINE] Score updated for session ${sessionId} from ${currentScore} to ${newScore}`);
        }
    }
    
    next();
  } catch (error) {
    console.error('Trust Engine error:', (error as any).message);
    // Fail open - don't crash the request if trust engine is down
    next();
  }
}
