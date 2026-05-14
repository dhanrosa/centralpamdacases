import pg from 'pg';
import { env } from './config.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}
