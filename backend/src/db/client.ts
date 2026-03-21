import { Pool, types } from "pg";
import { env } from "../config/env";

// Return PostgreSQL `date` columns as plain "YYYY-MM-DD" strings instead of
// JavaScript Date objects (which are always UTC midnight and shift by timezone
// when serialized, causing off-by-one-day bugs on non-UTC servers).
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({ connectionString: env.databaseUrl });

export const query = (text: string, params?: unknown[]) =>
    pool.query(text, params);
