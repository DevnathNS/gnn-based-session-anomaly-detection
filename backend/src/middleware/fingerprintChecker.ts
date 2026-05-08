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
