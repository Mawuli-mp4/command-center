import { sql } from '@/lib/db';
import { migrate } from '@/lib/migrate';
import { normalizeSchedule } from '@/lib/hours';

// Saves the weekly work-hours schedule. Body: { schedule: [{ on, start, end } × 7], Sunday first }.
export async function PUT(req) {
  const { schedule } = await req.json().catch(() => ({}));
  if (!Array.isArray(schedule) || schedule.length !== 7) {
    return Response.json({ error: 'The schedule needs one entry per day.' }, { status: 400 });
  }
  await migrate();
  const clean = normalizeSchedule(schedule);
  await sql`INSERT INTO settings (key, value, updated_at) VALUES ('schedule', ${JSON.stringify(clean)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  return Response.json({ ok: true, schedule: clean });
}
