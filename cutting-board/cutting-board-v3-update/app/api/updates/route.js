import { sql } from '@/lib/db';

export async function POST(req) {
  const { project_id, body } = await req.json();
  if (!project_id || !body?.trim()) return Response.json({ error: 'Pick a project and write an update.' }, { status: 400 });
  const [row] = await sql`INSERT INTO updates (project_id, body) VALUES (${project_id}, ${body.trim()})
    RETURNING id, project_id, body, created_at`;
  return Response.json(row);
}
