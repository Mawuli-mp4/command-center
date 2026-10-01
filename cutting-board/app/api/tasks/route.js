import { sql } from '@/lib/db';

export async function POST(req) {
  const { project_id, title, compute = 'low', due = null } = await req.json();
  if (!project_id || !title?.trim()) return Response.json({ error: 'A task needs a project and a title.' }, { status: 400 });
  const [row] = await sql`INSERT INTO tasks (project_id, title, compute, due, sort)
    VALUES (${project_id}, ${title.trim()}, ${compute === 'high' ? 'high' : 'low'}, ${due},
      (SELECT coalesce(max(sort), 0) + 1 FROM tasks WHERE project_id = ${project_id}))
    RETURNING id, project_id, title, compute, done, sort, to_char(due, 'YYYY-MM-DD') AS due`;
  return Response.json(row);
}
