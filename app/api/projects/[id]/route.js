import { sql } from '@/lib/db';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const b = await req.json();
  if ('status' in b) await sql`UPDATE projects SET status = ${b.status} WHERE id = ${id}`;
  if ('deadline' in b) await sql`UPDATE projects SET deadline = ${b.deadline || null} WHERE id = ${id}`;
  if ('priority' in b) await sql`UPDATE projects SET priority = ${Number(b.priority)} WHERE id = ${id}`;
  if ('summary' in b) await sql`UPDATE projects SET summary = ${b.summary} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return Response.json({ ok: true });
}
