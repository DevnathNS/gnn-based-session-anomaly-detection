import pg from 'pg';

const { Pool } = pg;

/**
 * PostgreSQL Connection Pool
 * Manages database connections
 */
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trust_system',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Error handling
pool.on('error', (err: Error) => {
  console.warn('⚠️  PostgreSQL Pool Error:', err.message);
});

/**
 * PostgreSQL Helper
 * Provides typed query interface
 */
export const db = {
  /**
   * Execute a query
   * Usage: await db.query('SELECT * FROM users WHERE id = $1', [userId])
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await pool.query(text, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  /**
   * Get a single row
   * Usage: const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId])
   */
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    try {
      const result = await pool.query(text, params);
      return (result.rows[0] as T) || null;
    } catch (error) {
      console.error('Database queryOne error:', error);
      throw error;
    }
  },

  /**
   * Get multiple rows
   * Usage: const users = await db.queryMany('SELECT * FROM users')
   */
  async queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
    try {
      const result = await pool.query(text, params);
      return result.rows as T[];
    } catch (error) {
      console.error('Database queryMany error:', error);
      throw error;
    }
  },

  /**
   * Execute a command (INSERT, UPDATE, DELETE)
   * Usage: await db.execute('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash])
   */
  async execute(text: string, params?: any[]): Promise<number> {
    try {
      const result = await pool.query(text, params);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  },

  /**
   * Get connection pool for transactions
   * Usage: const client = await db.getClient(); await client.query(...); await client.release();
   */
  async getClient() {
    return await pool.connect();
  },

  /**
   * Close all connections
   * Usage: await db.close()
   */
  async close() {
    await pool.end();
  },
};

/**
 * User type definitions
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('📊 Initializing database schema...');

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Users table ready');

    // Create sessions table (for audit trail)
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        trust_score INTEGER DEFAULT 90,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        device_fingerprint TEXT,
        ip_address VARCHAR(45)
      )
    `);
    
    await db.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 90
    `);
    
    await db.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP
    `);

    console.log('✓ Sessions table ready');

    // Create request_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS request_logs (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        user_id INTEGER,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        trust_score INTEGER,
        allowed BOOLEAN,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Request logs table ready');

    // Create audit logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        session_id VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Audit logs table ready');


    // Create indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `);
	
	 await pool.query(`
      CREATE TABLE IF NOT EXISTS session_graphs (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        nodes JSONB NOT NULL,
        edges JSONB NOT NULL,
        label VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✓ `session_graphs` table is ready.');
	
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
    `);

    console.log('✓ Indexes created');
    console.log('✅ Database schema initialized successfully\n');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Seed database with test data (development only)
 */
export async function seedDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return; // Don't seed in production
  }

  try {
    // Check if already seeded
    const count = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );

    if (count && count.count > 0) {
      console.log('✓ Database already seeded, skipping');
      return;
    }

    console.log('🌱 Seeding database with test data...');

    // We'll add bcrypt hashing later when we create auth routes
    // For now, just a placeholder

    console.log('✓ Test data added');
  } catch (error) {
    console.warn('⚠️  Could not seed database:', error);
    // Don't fail if seeding fails
  }
}

export default db;
