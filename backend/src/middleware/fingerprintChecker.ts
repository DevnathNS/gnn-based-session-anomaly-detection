import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';

export async function fingerprintChecker(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.sessionId;
    if (!sessionId) return next();
    const client = (redisClient as any).getClient?.() || redisClient;
    const testVal = await client.get(`session:${sessionId}:fingerprint`);
    console.log('[FINGERPRINT RAW TEST]', testVal);

    const currentFingerprint = req.headers['x-device-fingerprint'] as string;
    if (!currentFingerprint) return next();

    const storedFingerprint = await redisClient.get(
      `session:${sessionId}:fingerprint`
    );

    if (!storedFingerprint) {
      await redisClient.set(
        `session:${sessionId}:fingerprint`,
        currentFingerprint,
        86400
      );
      (req as any).signals = { ...(req as any).signals, device_changed: false };
    } else if (storedFingerprint !== currentFingerprint) {
      console.log(`[FINGERPRINT] Device change detected for session ${sessionId}`);
      (req as any).signals = { ...(req as any).signals, device_changed: true };
      
      const scoreKey=`session:${sessionId}:trust_score`;
      const currentScoreStr = await redisClient.get(scoreKey);
      let currentScore= currentScoreStr ? parseInt(currentScoreStr) : 90;
      currentScore= Math.max(0,currentScore-20);
      await redisClient.set(scoreKey, currentScore.toString(), 86400);

      const userId = await redisClient.get(`session:${sessionId}:user_id`);
      if (userId) {
         await redisClient.set(`user:${userId}:historical_trust_score`, currentScore.toString());
      }

      console.log(`[SCORE] Penalized 20 points. New score: ${currentScore}`);
      await redisClient.set(`session:${sessionId}:fingerprint`, currentFingerprint, 86400);
      
    } else {
      (req as any).signals = { ...(req as any).signals, device_changed: false };
    }

    next();
  } catch (err) {
    console.error('Fingerprint check error:', err);
    next();
  }
}
