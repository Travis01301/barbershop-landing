import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

/**
 * Centralized PostgreSQL connection pool
 * Reused across all API routes to prevent connection leaks
 */
let pool: Pool | null = null;

/**
 * Get or initialize the database connection pool
 */
export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  const dbName = process.env.DB_NAME || 'barbershop_booking';
  const dbUser = process.env.DB_USER || 'barbershop_user';
  const dbPassword = process.env.DB_PASSWORD || 'your_secure_password_here';

  // Use DATABASE_URL if provided, otherwise build from individual vars
  const config = connectionString
    ? { connectionString }
    : {
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
      };

  const dbLogger = logger.createChild('database');

  pool = new Pool({
    ...config,
    max: 20, // max number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30s
    connectionTimeoutMillis: 5000, // timeout for acquiring a connection
  });

  // Log pool errors
  pool.on('error', (err) => {
    dbLogger.error('Unexpected error on idle client', err);
  });

  // Log pool events in development
  if (process.env.NODE_ENV === 'development') {
    dbLogger.debug('Database pool initialized', {
      host: dbHost,
      port: dbPort,
      database: dbName,
      maxConnections: 20,
    });
  }

  return pool;
}

/**
 * Close the database pool (useful for cleanup)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    const dbLogger = logger.createChild('database');
    try {
      await pool.end();
      dbLogger.info('Database pool closed');
      pool = null;
    } catch (err) {
      dbLogger.error('Error closing database pool', err);
    }
  }
}

/**
 * Execute a query using the pool
 */
export async function query<T = any>(
  text: string,
  values?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const dbLogger = logger.createChild('database');
  const startTime = Date.now();

  try {
    const p = getPool();
    const result = await p.query(text, values);
    const duration = Date.now() - startTime;

    dbLogger.debug('Query executed', {
      rowCount: result.rowCount,
      duration: `${duration}ms`,
    });

    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    dbLogger.error('Query failed', {
      error: err instanceof Error ? err.message : String(err),
      duration: `${duration}ms`,
    });
    throw err;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  const dbLogger = logger.createChild('database');

  try {
    const client = await p.connect();
    dbLogger.debug('Client acquired from pool');
    return client;
  } catch (err) {
    dbLogger.error('Failed to acquire client from pool', err);
    throw err;
  }
}

/**
 * Health check - verify database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  const dbLogger = logger.createChild('database.health');

  try {
    const result = await query('SELECT 1');
    dbLogger.info('Health check passed');
    return result.rows.length > 0;
  } catch (err) {
    dbLogger.error('Health check failed', err);
    return false;
  }
}

export default { getPool, closePool, query, getClient, healthCheck };
