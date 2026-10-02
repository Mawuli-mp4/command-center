import { sql } from '@/lib/db';
import { pushAll } from '@/lib/push';
export const dynamic = 'force-dynamic';

// Runs at 7 am (high-compute block) and 3 pm (low-compute block), Montreal time.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const mode = new URL(req.url).searchParams.get('mode') === 'low' ? 'low' : 'high';

  const due = await sql`SELECT name, (deadline - (now() AT TIME ZONE 'America/Toronto')::date) AS days
    FROM projects WHERE status = 'active' AND deadline IS NOT NULL
      AND deadline <= (now() AT TIME ZONE 'America/Toronto')::date + 2
    ORDER BY deadline`;
  const next = await sql`SELECT t.title FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.done = false AND t.compute = ${mode} AND p.status = 'active'
    ORDER BY p.priority, p.deadline NULLS LAST, t.sort, t.id LIMIT 3`;

  const dueLine = due.map((d) => `${d.name} ${d.days < 0 ? 'overdue' : d.days === 0 ? 'today' : d.days === 1 ? 'tomorrow' : `in ${d.days} days`}`).join('; ');
  const body = [dueLine && `Due: ${dueLine}.`, next.length && `Next: ${next.map((t) => t.title).join(' / ')}`].filter(Boolean).join('\n');

  const title = mode === 'high' ? 'Workstation block until 3 pm' : 'Laptop block starts now';
  const r = await pushAll({ title, body: body || 'Nothing queued for this block.' });
  return Response.json({ mode, ...r });
}
