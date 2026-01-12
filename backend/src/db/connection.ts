import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  }
  : (() => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: DATABASE_URL is not set in production. Defaulting to localhost, which may fail.');
    }
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'test_case_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    };
  })();

// #region agent log
console.log(JSON.stringify({
  sessionId: 'debug-session',
  runId: 'run1',
  hypothesisId: 'H1',
  location: 'backend/src/db/connection.ts:config',
  message: 'DB pool config selected',
  data: { hasDatabaseUrl: !!process.env.DATABASE_URL, ssl: poolConfig && (poolConfig as any).ssl ? true : false, nodeEnv: process.env.NODE_ENV },
  timestamp: Date.now()
}));
// #endregion

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Don't connect immediately - lazy connection
  allowExitOnIdle: true,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  // #region agent log
  console.log(JSON.stringify({
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'H1',
    location: 'backend/src/db/connection.ts:pool-error',
    message: 'Pool error event',
    data: { errorMessage: err.message, errorName: err.name },
    timestamp: Date.now()
  }));
  // #endregion
});

// Test connection lazily - don't block module load
let connectionTested = false;
const testConnection = async () => {
  if (connectionTested) return;
  connectionTested = true;
  try {
    const client = await pool.connect();
    client.release();
    // #region agent log
    console.log(JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H1',
      location: 'backend/src/db/connection.ts:test-connection',
      message: 'DB connection test successful',
      data: {},
      timestamp: Date.now()
    }));
    // #endregion
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    // #region agent log
    console.log(JSON.stringify({
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H1',
      location: 'backend/src/db/connection.ts:test-connection-failed',
      message: 'DB connection test failed',
      data: { errorMessage: error?.message, errorName: error?.name },
      timestamp: Date.now()
    }));
    // #endregion
    // Don't throw - let queries fail gracefully
  }
};

export default pool;
export { testConnection };

