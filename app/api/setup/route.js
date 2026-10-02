import { sql } from '@/lib/db';
import { SEED } from '@/lib/seed';

export async function POST() {
  await sql`CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, lane TEXT, priority INT DEFAULT 2,
    status TEXT DEFAULT 'active', deadline DATE, summary TEXT, sort INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY, project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, compute TEXT DEFAULT 'low', done BOOLEAN DEFAULT false,
    done_at TIMESTAMPTZ, est_hours NUMERIC,
    due DATE, sort INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS updates (
    id SERIAL PRIMARY KEY, project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    body TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY, sub JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`;

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM projects`;
  if (n === 0) {
    for (const [i, p] of SEED.entries()) {
      const [row] = await sql`INSERT INTO projects (name, lane, priority, deadline, summary, sort)
        VALUES (${p.name}, ${p.lane}, ${p.priority}, ${p.deadline}, ${p.summary}, ${i}) RETURNING id`;
      for (const [j, [title, compute, est = null]] of p.tasks.entries()) {
        await sql`INSERT INTO tasks (project_id, title, compute, est_hours, sort)
          VALUES (${row.id}, ${title}, ${compute}, ${est}, ${j})`;
      }
    }
  }
  return Response.json({ ok: true, seeded: n === 0 });
}
