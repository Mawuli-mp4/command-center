import { sql } from '@/lib/db';
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
  const tasks = await sql`SELECT id, project_id, title, compute, done, sort,
    to_char(due, 'YYYY-MM-DD') AS due FROM tasks ORDER BY done, sort, id`;
  const updates = await sql`SELECT id, project_id, body, created_at FROM updates
    ORDER BY created_at DESC LIMIT 80`;
  return Response.json({ projects, tasks, updates, ai: !!process.env.ANTHROPIC_API_KEY });
}
