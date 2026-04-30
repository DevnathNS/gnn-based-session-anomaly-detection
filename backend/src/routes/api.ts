import {Router, Request, Response} from 'express';
import { redisClient } from '../db/redis';
import { db } from '../db/postgres';

const router = Router();

/**
 * @swagger
 * /api/public/news:
 *   get:
 *     summary: Get public news feed
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of news articles
 */

/**
 * @swagger
 * /api/public/about:
 *   get:
 *     summary: Get app information
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: App name and version
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Step-up auth required 
 *       403:
 *         description: Trust score too low 
 */

/**
 * @swagger
 * /api/user/profile:
 *   post:
 *     summary: Update user profile
 *     tags: [User]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               theme:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /api/user/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User settings object
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Array of user records
 */

/**
 * @swagger
 * /api/admin/users/{id}/delete:
 *   post:
 *     summary: Delete a user by ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */

/**
 * @swagger
 * /api/payments/transfer:
 *   post:
 *     summary: Initiate a payment transfer
 *     tags: [Sensitive]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               to:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer initiated
 */

/**
 * @swagger
 * /api/data/export:
 *   get:
 *     summary: Export user data
 *     tags: [Sensitive]
 *     responses:
 *       200:
 *         description: Export job queued
 */
 
/**
 * @swagger
 * /api/session/stats:
 *    get:
 *       summary: Get current session stats and trust score history
 *       tags: [Session]
 *       security:
 *          - bearerAuth: []
 *       responses:
 *          200:
 *             description: Session statistics
*/

router.get('/public/news', (req: Request, res:Response) => {
	res.json({
		endpoint: '/api/public/news',
		data: {
			articles: [
				{title: 'System Update', date: '2026-04-13'},
				{title: 'Scheduled Maintainence', date: '2026-04-19'},
			]
		},
		timestamp: new Date().toISOString()
	});
});

router.get('/public/about', (req: Request, res:Response) => {
	res.json({
		endpoint: '/api/public/about',
		data: {appName: 'ZeroTrust Application', version:'1.0.0'},
		timestamp: new Date().toISOString()
	});
});

router.get('/user/profile', async (req: Request, res: Response) => {
  	try {
    		const userId = (req as any).user?.userId; 
    		const user = await db.queryOne('SELECT id, email FROM users WHERE id=$1', [userId]); 

    		res.json({
      			endpoint: '/api/user/profile', 
      			data: {
        			name: user?.email?.split('@')[0], 
        			email: user?.email, 
        			role: 'member',
        			usage: { apiCallsToday: 0, activeProjects: 1 }
      			},
      			timestamp: new Date().toISOString() 
   	 	});
 	 } catch (err) {
   		console.error('Profile fetch error:', err);
    		res.status(500).json({ error: 'Failed to fetch profile data' });
 	 }
});


router.post('/user/profile', (req: Request, res:Response) => {
	res.json({
		endpoint: '/api/user/profile',
		data: {updated: true, fields: req.body},
		timestamp: new Date().toISOString()
	});
});



router.get('/user/settings', (req: Request, res:Response) => {
	res.json({
		endpoint: '/api/user/settings',
		data: {theme:'dark', notifications:true, language:'en'},
		timestamp: new Date().toISOString()
	});
});

router.get('/admin/users', async (req: Request, res: Response) => {
  	try {
    		const userId = (req as any).user?.userId; 
    		const users = await db.queryMany('SELECT id, email, created_at FROM users ORDER BY created_at DESC'); 
    		const formattedUsers = users.map(u => ({
    		...u,
    		role: 'member'
    		}));

    		res.json({
      			endpoint: '/api/admin/users', 
      			data: {
        			users: formattedUsers
      			},
      			timestamp: new Date().toISOString() 
   	 	});
 	 } catch (err) {
   		console.error('Admin users fetch error:', err);
    		res.status(500).json({ error: 'Failed to fetch profile data' });
 	 }
});


router.post('/admin/users/:id/delete', (req: Request, res:Response) => {
	res.json({
		endpoint: `/api/admin/users/${req.params.id}/delete`,
		data: {delete:true, userId: req.params.id},
		timestamp: new Date().toISOString()			
	});
});

router.post('/payments/transfer', (req: Request, res:Response) => {
	res.json({
		endpoint: '/api/payments/transfer',
		data: {transferId: 'txn_zta001', status:'pending', amount:req.body.amount},
		timestamp: new Date().toISOString()			
	});
});

router.get('/data/export', (req: Request, res:Response) => {
	res.json({
		endpoint: '/api/data/export',
		data: {exportId:'exp_zta001',status:'queued',format:'csv'},
		timestamp: new Date().toISOString()			
	});
});

router.get('/session/stats', async (req: Request, res:Response) => {
	try {
		const sessionId = (req as any).user?.sessionId;
		const currentScore = await redisClient.get(`session:${sessionId}:trust_score`);
		
		const recentResult = await db.query (
		    `SELECT endpoint, method, trust_score, allowed, timestamp
		    FROM request_logs
		    WHERE session_id=$1
		    ORDER BY timestamp DESC
		    LIMIT 20`,
		    [sessionId]
		);
		
		const historyResult = await db.query (
		    `SELECT trust_score, timestamp
		    FROM request_logs
		    WHERE session_id=$1
		    ORDER BY timestamp DESC
		    LIMIT 50`,
		    [sessionId]
		);
		
		res.json({
			endpoint: '/api/session/stats',
			data: {currentScore: currentScore ? parseInt(currentScore) : 90, 
			       recentRequests: recentResult.rows,
			       scoreHistory: historyResult.rows.reverse()
			},
			timestamp: new Date().toISOString()			
		});
	} catch (err) {
		console.error('Stats error: ',err);
		res.status(500).json({error: 'Failed to fetch session stats'});
	}
});

export default router;
