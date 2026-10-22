import { sql } from '@/lib/db';
import { migrate } from '@/lib/migrate';
import { normalizeSchedule } from '@/lib/hours';
export const dynamic = 'force-dynamic';

export async function GET() {
  let projects;
  try {
    projects = await sql`SELECT id, name, lane, priority, status, summary, sort,
      to_char(deadline, 'YYYY-MM-DD') AS deadline FROM projects
      ORDER BY (status = 'done'), priority, deadline NULLS LAST, sort, id`;
  } catch (e) {
    if (/does not exist/.test(e.message)) return Response.json({ needsSetup: true });
    if (!process.env.DATABASE_URL) return Response.json({ error: 'DATABASE_URL is not set. Connect a Postgres database in Vercel → Storage.' }, { status: 500 });
    throw e;
  }
  await migrate();
  const tasks = await sql`SELECT id, project_id, title, compute, done, sort, est_hours::float AS est_hours,
    to_char(due, 'YYYY-MM-DD') AS due,
    to_char((done_at AT TIME ZONE 'America/Toronto')::date, 'YYYY-MM-DD') AS done_day
    FROM tasks ORDER BY done, sort, id`;
  const updates = await sql`SELECT id, project_id, body, created_at FROM updates
    ORDER BY created_at DESC LIMIT 80`;
  // Tasks closed per Montreal day, last 8 days (client trims to 7)
  const closed = await sql`SELECT to_char((done_at AT TIME ZONE 'America/Toronto')::date, 'YYYY-MM-DD') AS day,
    compute, count(*)::int AS n FROM tasks
    WHERE done = true AND done_at >= now() - interval '8 days' GROUP BY 1, 2`;
  const events = await sql`SELECT id, title, kind, notes,
    to_char(start_date, 'YYYY-MM-DD') AS start, to_char(end_date, 'YYYY-MM-DD') AS "end"
    FROM events ORDER BY start_date NULLS LAST, id`;
  const [sched] = await sql`SELECT value FROM settings WHERE key = 'schedule'`;
  const schedule = normalizeSchedule(sched?.value);
  return Response.json({ projects, tasks, updates, closed, schedule, events, ai: !!process.env.ANTHROPIC_API_KEY });
}
