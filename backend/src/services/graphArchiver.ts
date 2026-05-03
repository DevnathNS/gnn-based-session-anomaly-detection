import pool from '../db/postgres';
import redisClient from '../db/redis';

export async function archiveSessionGraphs() {
	console.log('[ARCHIVER] Waiting up to archive active session graphs..');
	
	try {
		const client= redisClient.getClient();
		const keys= await client.keys('session:*:graph');
		
		if(keys.length===0) {
			console.log('[ARCHIVER] No active graphs to archive right now.');
			return;
		}
		
		let successCount=0;
		
		for (const rawKey of keys) {
		    const key = String(rawKey);
			const sessionId =key.split(':')[1];
			const graphDataStr = await redisClient.get(key);
			if(!graphDataStr) continue;
			
			const graphData = JSON.parse(graphDataStr);
			const query = `
				INSERT INTO session_graphs (session_id, nodes, edges) 
				VALUES ($1, $2, $3) 
				ON CONFLICT (session_id)
				DO UPDATE SET
				nodes = EXCLUDED.nodes,
				edges = EXCLUDED.edges,
				updated_at = CURRENT_TIMESTAMP;
			`;
			
			await pool.query(query, [
				sessionId, JSON.stringify(graphData.nodes), JSON.stringify(graphData.edges) ]);
				
			successCount++;
		}
		console.log(`[ARCHIVER] Successfully archived ${successCount} session graphs to PostgreSQL.`);
	} catch (err) {
		console.error(`[ARCHIVER] Error archiving graphs`);
	}
}

export function startGraphArchiver() {
  setInterval(archiveSessionGraphs, 1000* 60 * 5);
  console.log('🕒 Graph Archiver started (runs every 5 mins).');
}
