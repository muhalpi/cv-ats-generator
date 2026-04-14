import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "",
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
