import { sql } from '@/lib/db';

// Turns a dictated memo into a proposal. Nothing is written until /api/apply.
export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: 'Add ANTHROPIC_API_KEY in Vercel to use auto-routing.' }, { status: 400 });
  const { text } = await req.json();
  if (!text?.trim()) return Response.json({ error: 'The memo is empty.' }, { status: 400 });

  const projects = await sql`SELECT id, name, summary FROM projects WHERE status <> 'done'`;
  const tasks = await sql`SELECT id, project_id, title FROM tasks WHERE done = false`;

  const system = `You file dictated voice memos into a project tracker.
Projects: ${JSON.stringify(projects)}
Open tasks: ${JSON.stringify(tasks)}
Return ONLY a JSON object, no prose and no code fences:
{"items":[{"project_id":number,"update":string,"complete_task_ids":number[],"new_tasks":[{"title":string,"compute":"high"|"low"}]}]}
Rules: split the memo across projects when it covers several. "update" is a clean one-to-three sentence log entry in the speaker's voice; fix dictation errors (e.g. "Hope of me" = Hopamine). Mark a task complete only when the memo clearly says it's done. compute is "high" for footage editing, color, renders and back-end development; "low" for writing, decks, outreach, calls, social edits. Use only ids that exist.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: text }],
    }),
  });
  const data = await r.json();
  if (!r.ok) return Response.json({ error: data?.error?.message || 'The AI request failed.' }, { status: 502 });

  const raw = (data.content || []).map((c) => c.text || '').join('').replace(/```json|```/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return Response.json({ error: 'Couldn’t read the AI response. Try logging it to a project directly.' }, { status: 502 }); }

  const pids = new Set(projects.map((p) => p.id));
  const tids = new Set(tasks.map((t) => t.id));
  const items = (parsed.items || [])
    .filter((i) => pids.has(i.project_id))
    .map((i) => ({
      project_id: i.project_id,
      update: String(i.update || '').trim(),
      complete_task_ids: (i.complete_task_ids || []).filter((id) => tids.has(id)),
      new_tasks: (i.new_tasks || []).filter((t) => t?.title).map((t) => ({ title: String(t.title), compute: t.compute === 'high' ? 'high' : 'low' })),
    }));
  return Response.json({ items });
}
