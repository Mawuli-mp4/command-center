import { sql } from '@/lib/db';

export async function POST(req) {
  const { items = [] } = await req.json();
  for (const i of items) {
    if (i.update) await sql`INSERT INTO updates (project_id, body) VALUES (${i.project_id}, ${i.update})`;
    for (const id of i.complete_task_ids || []) await sql`UPDATE tasks SET done = true, done_at = now() WHERE id = ${id}`;
    for (const t of i.new_tasks || []) {
      await sql`INSERT INTO tasks (project_id, title, compute, sort) VALUES (${i.project_id}, ${t.title}, ${t.compute},
        (SELECT coalesce(max(sort), 0) + 1 FROM tasks WHERE project_id = ${i.project_id}))`;
    }
  }
  return Response.json({ ok: true });
}
