import { sql } from '@/lib/db';

export async function POST(req) {
  const { name, lane = null, priority = 2, deadline = null, summary = null } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'A project needs a name.' }, { status: 400 });
  const [row] = await sql`INSERT INTO projects (name, lane, priority, deadline, summary, sort)
    VALUES (${name.trim()}, ${lane}, ${priority}, ${deadline || null}, ${summary},
      (SELECT coalesce(max(sort), 0) + 1 FROM projects)) RETURNING id`;
  return Response.json(row);
}
