import { sql } from '@/lib/db';
import { cleanEvent } from '@/lib/events';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const e = cleanEvent(await req.json().catch(() => ({})));
  if (e.error) return Response.json({ error: e.error }, { status: 400 });
  await sql`UPDATE events SET title = ${e.title}, kind = ${e.kind}, start_date = ${e.start}, end_date = ${e.end}, notes = ${e.notes}
    WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await sql`DELETE FROM events WHERE id = ${id}`;
  return Response.json({ ok: true });
}
