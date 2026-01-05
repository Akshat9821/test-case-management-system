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

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

