import { sql } from './db';
import { EST_BACKFILL, EVENT_SEED } from './seed';

let done = false;
// Brings older boards up to date (new columns, settings and events tables). Safe to run repeatedly.
export async function migrate() {
  if (done) return;
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, kind TEXT DEFAULT 'event',
    start_date DATE, end_date DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  const [seeded] = await sql`SELECT 1 AS x FROM settings WHERE key = 'events_seeded'`;
  if (!seeded) {
    for (const e of EVENT_SEED) {
      await sql`INSERT INTO events (title, kind, start_date, end_date, notes)
        VALUES (${e.title}, ${e.kind}, ${e.start || null}, ${e.end || null}, ${e.notes || null})`;
    }
    await sql`INSERT INTO settings (key, value) VALUES ('events_seeded', 'true'::jsonb) ON CONFLICT (key) DO NOTHING`;
  }
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'`;
  const have = new Set(cols.map((c) => c.column_name));
  if (!have.has('done_at')) {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ`;
  }
  if (!have.has('est_hours')) {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS est_hours NUMERIC`;
    for (const [title, h] of Object.entries(EST_BACKFILL)) {
      await sql`UPDATE tasks SET est_hours = ${h} WHERE title = ${title} AND est_hours IS NULL`;
    }
  }
  done = true;
}
