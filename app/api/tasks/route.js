import { sql } from '@/lib/db';

const toHours = (v) => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) || n <= 0 ? null : n; };

export async function POST(req) {
  const { project_id, title, compute = 'low', due = null, est_hours = null } = await req.json();
  if (!project_id || !title?.trim()) return Response.json({ error: 'A task needs a project and a title.' }, { status: 400 });
  const [row] = await sql`INSERT INTO tasks (project_id, title, compute, due, est_hours, sort)
    VALUES (${project_id}, ${title.trim()}, ${compute === 'high' ? 'high' : 'low'}, ${due}, ${toHours(est_hours)},
      (SELECT coalesce(max(sort), 0) + 1 FROM tasks WHERE project_id = ${project_id}))
    RETURNING id, project_id, title, compute, done, sort, est_hours::float AS est_hours, to_char(due, 'YYYY-MM-DD') AS due`;
  return Response.json(row);
}
