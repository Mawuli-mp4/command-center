import { sql } from './db';
import { EST_BACKFILL } from './seed';

let done = false;
// Adds columns introduced in v2 to boards created with v1. Safe to run repeatedly.
export async function migrate() {
  if (done) return;
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
