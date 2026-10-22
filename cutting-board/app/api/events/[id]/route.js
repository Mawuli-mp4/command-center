import { sql } from '@/lib/db';
import { cleanEvent } from '@/lib/events';
import { resolveParent } from '@/lib/eventLinks';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const e = cleanEvent(await req.json().catch(() => ({})));
  if (e.error) return Response.json({ error: e.error }, { status: 400 });
  const parent = await resolveParent(sql, e.parent_id, Number(id));
  await sql`UPDATE events SET title = ${e.title}, kind = ${e.kind}, start_date = ${e.start}, end_date = ${e.end},
    notes = ${e.notes}, parent_id = ${parent}, role = ${parent ? e.role : null} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

// Deleting a campaign's main item unlinks its items instead of deleting them.
export async function DELETE(_req, { params }) {
  const { id } = await params;
  await sql`UPDATE events SET parent_id = NULL, role = NULL WHERE parent_id = ${id}`;
  await sql`DELETE FROM events WHERE id = ${id}`;
  return Response.json({ ok: true });
}
