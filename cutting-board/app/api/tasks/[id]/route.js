import { sql } from '@/lib/db';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const b = await req.json();
  if ('done' in b) await sql`UPDATE tasks SET done = ${!!b.done} WHERE id = ${id}`;
  if ('compute' in b) await sql`UPDATE tasks SET compute = ${b.compute === 'high' ? 'high' : 'low'} WHERE id = ${id}`;
  if ('title' in b && b.title.trim()) await sql`UPDATE tasks SET title = ${b.title.trim()} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await sql`DELETE FROM tasks WHERE id = ${id}`;
  return Response.json({ ok: true });
}
