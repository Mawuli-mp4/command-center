import { sql } from '@/lib/db';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const b = await req.json();
  if ('done' in b) {
    if (b.done) await sql`UPDATE tasks SET done = true, done_at = now() WHERE id = ${id}`;
    else await sql`UPDATE tasks SET done = false, done_at = NULL WHERE id = ${id}`;
  }
  if ('compute' in b) await sql`UPDATE tasks SET compute = ${b.compute === 'high' ? 'high' : 'low'} WHERE id = ${id}`;
  if ('title' in b && b.title.trim()) await sql`UPDATE tasks SET title = ${b.title.trim()} WHERE id = ${id}`;
  if ('est_hours' in b) {
    const n = Number(b.est_hours);
    await sql`UPDATE tasks SET est_hours = ${Number.isFinite(n) && n > 0 ? n : null} WHERE id = ${id}`;
  }
  return Response.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await sql`DELETE FROM tasks WHERE id = ${id}`;
  return Response.json({ ok: true });
}
