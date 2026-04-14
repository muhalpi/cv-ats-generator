/**
 * Vercel deployment migration script.
 * Creates database tables if they don't exist.
 * Runs as part of the build:vercel command.
 * Gracefully skips if DATABASE_URL is not available.
 */

import pg from "pg";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("[migrate] DATABASE_URL not set — skipping migration.");
  process.exit(0);
}

const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  console.log("[migrate] Connected to database.");

  await client.query(`
    CREATE TABLE IF NOT EXISTS cvs (
      id          SERIAL PRIMARY KEY,
      full_name   TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      location    TEXT,
      job_title   TEXT NOT NULL,
      summary     TEXT NOT NULL DEFAULT '',
      skills      JSONB NOT NULL DEFAULT '[]',
      languages   JSONB NOT NULL DEFAULT '[]',
      work_experience  JSONB NOT NULL DEFAULT '[]',
      education        JSONB NOT NULL DEFAULT '[]',
      extra_sections   JSONB NOT NULL DEFAULT '[]',
      linkedin_url     TEXT,
      portfolio_url    TEXT,
      cv_language      TEXT DEFAULT 'en',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("[migrate] Table 'cvs' is ready.");
} catch (err) {
  console.error("[migrate] Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
