import { createClient } from 'redis';

// Initialize Redis client
const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
  },
});

// Error handling
client.on('error', (err: Error) => {
  console.warn('⚠️  Redis Client Error (will retry automatically):', err.message);
});

client.on('connect', () => {
  console.log('✓ Redis Client Connected');
});

client.on('reconnecting', () => {
  console.log('↻ Redis Client Reconnecting...');
});

// Connect to Redis (non-blocking - will retry automatically)
client.connect().catch((err: Error) => {
  console.warn('⚠️  Redis connection failed (will retry in background):', err.message);
  // Don't exit - Redis will retry automatically
});

/**
 * Redis wrapper with typed helpers
 */
export const redisClient = {
  /**
   * Get a value
   * Usage: await redisClient.get('key')
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await client.get(key);
      return result ? (typeof result === 'string' ? result : result.toString()) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Get a value and parse as JSON
   * Usage: const obj = await redisClient.getJSON('key')
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await client.get(key);
      if (!value) return null;
      const valueStr = typeof value === 'string' ? value : value.toString();
      return JSON.parse(valueStr);
    } catch (error) {
      console.error(`Redis GETJSON error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set a value with optional expiry
   * Usage: await redisClient.set('key', 'value', 3600)
   */
  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    try {
      if (expirySeconds) {
        await client.set(key, value, { EX: expirySeconds });
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  },

  /**
   * Set a JSON value with optional expiry
   * Usage: await redisClient.setJSON('key', {foo: 'bar'}, 3600)
   */
  async setJSON(key: string, value: any, expirySeconds?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, expirySeconds);
    } catch (error) {
      console.error(`Redis SETJSON error for key ${key}:`, error);
    }
  },

  /**
   * Increment a counter
   * Usage: const newValue = await redisClient.incr('key')
   */
  async incr(key: string): Promise<number> {
    try {
      const result = await client.incr(key);
      return typeof result === 'number' ? result : parseInt(result as string);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Push to a list (left side)
   * Usage: await redisClient.lpush('key', 'value')
   */
  async lpush(key: string, value: string): Promise<number> {
    try {
      const result = await client.lPush(key, value);
      return typeof result === 'number' ? result : parseInt(result as string);
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Push JSON object to a list
   * Usage: await redisClient.lpushJSON('key', {foo: 'bar'})
   */
  async lpushJSON(key: string, value: any): Promise<number> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.lpush(key, jsonString);
    } catch (error) {
      console.error(`Redis LPUSHJSON error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Get range from list
   * Usage: const items = await redisClient.lrange('key', 0, 10)
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      const values = await client.lRange(key, start, stop);
      return values.map(v => typeof v === 'string' ? v : (v as any).toString());
    } catch (error) {
      console.error(`Redis LRANGE error for key ${key}:`, error);
      return [];
    }
  },

  /**
   * Get all list items as JSON
   * Usage: const items = await redisClient.lrangeJSON('key')
   */
  async lrangeJSON<T>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
    try {
      const values = await this.lrange(key, start, stop);
      return values.map(v => JSON.parse(v));
    } catch (error) {
      console.error(`Redis LRANGEJSON error for key ${key}:`, error);
      return [];
    }
  },

  /**
   * Set expiry on a key
   * Usage: await redisClient.expire('key', 3600)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete a key
   * Usage: await redisClient.del('key')
   */
  async del(key: string): Promise<number> {
    try {
      const result = await client.del(key);
      return typeof result === 'number' ? result : parseInt(result as string);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   * Usage: const exists = await redisClient.exists('key')
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get raw Redis client for advanced operations
   */
  getClient() {
    return client;
  },
};

export default redisClient;
