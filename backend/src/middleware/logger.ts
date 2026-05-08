import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';
import { db } from '../db/postgres'

export async function logger (
	req: Request,
	res: Response,
	next: NextFunction
) {
	res.on('finish', async()=> {
		try {
			const sessionId= (req as any).user?.sessionId;
			if (!sessionId) return;
			
			const score= await redisClient.get(`session:${sessionId}:trust_score`);
			const userId = (req as any).user?.userId;
			
			await db.query (
				`INSERT INTO request_logs (session_id,user_id,endpoint,method,trust_score,allowed) VALUES ($1,$2,$3,$4,$5,$6)`, 
				[
					sessionId,
					userId,
					req.originalUrl.split('?')[0],
					req.method,
					score ? parseInt(score) : null,
					res.statusCode < 400 
				]
			);
		} catch(err) {
			console.error('Logger error: ',err);
		}
	});
	next();
}
