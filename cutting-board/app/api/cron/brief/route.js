import { sql } from '@/lib/db';
import { pushAll } from '@/lib/push';
import { migrate } from '@/lib/migrate';
import { montrealNow, normalizeSchedule, dayHours, fmtHour } from '@/lib/hours';
export const dynamic = 'force-dynamic';

// Two daily briefs (times live in vercel.json):
//   morning: every day. On a day with workstation hours it briefs the workstation block; otherwise laptop work.
//   evening: weekday evenings. Briefs laptop work; skipped on days with no workstation block.
// The content follows the Work hours you set in the app. Vercel Hobby crons fire once a day
// within the scheduled UTC hour, so the delivery time itself stays fixed.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const param = new URL(req.url).searchParams.get('mode');
  const slot = param === 'evening' || param === 'low' ? 'evening' : 'morning';

  await migrate();
  const [row] = await sql`SELECT value FROM settings WHERE key = 'schedule'`;
  const sched = normalizeSchedule(row?.value);
  const now = montrealNow();
  const hrs = dayHours(sched, now.date);

  if (slot === 'evening' && !hrs) return Response.json({ skipped: 'no workstation block today' });
  const block = slot === 'morning' && hrs ? 'high' : 'low';

  const due = await sql`SELECT name, (deadline - (now() AT TIME ZONE 'America/Toronto')::date) AS days
    FROM projects WHERE status = 'active' AND deadline IS NOT NULL
      AND deadline <= (now() AT TIME ZONE 'America/Toronto')::date + 2
      AND EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = projects.id AND t.done = false)
    ORDER BY deadline`;
  const next = await sql`SELECT t.title FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.done = false AND t.compute = ${block} AND p.status = 'active'
    ORDER BY p.priority, p.deadline NULLS LAST, t.sort, t.id LIMIT 3`;

  const dueLine = due.map((d) => `${d.name} ${d.days < 0 ? 'overdue' : d.days === 0 ? 'today' : d.days === 1 ? 'tomorrow' : `in ${d.days} days`}`).join('; ');
  const body = [dueLine && `Due: ${dueLine}.`, next.length && `Next: ${next.map((t) => t.title).join(' / ')}`].filter(Boolean).join('\n');

  const title = block === 'high' ? `Workstation block today, ${fmtHour(hrs.start)} to ${fmtHour(hrs.end)}`
    : slot === 'evening' ? `Laptop block from ${fmtHour(hrs.end)}`
    : 'No workstation block today: laptop day';
  const r = await pushAll({ title, body: body || 'Nothing queued for this block.' });
  return Response.json({ slot, block, ...r });
}
