import { sql } from '@/lib/db';
import { migrate } from '@/lib/migrate';
import { cleanEvent } from '@/lib/events';

export async function POST(req) {
  const e = cleanEvent(await req.json().catch(() => ({})));
  if (e.error) return Response.json({ error: e.error }, { status: 400 });
  await migrate();
  const [row] = await sql`INSERT INTO events (title, kind, start_date, end_date, notes)
    VALUES (${e.title}, ${e.kind}, ${e.start}, ${e.end}, ${e.notes}) RETURNING id`;
  return Response.json(row);
}
