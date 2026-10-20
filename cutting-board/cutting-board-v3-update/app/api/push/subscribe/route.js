import { sql } from '@/lib/db';

export async function POST(req) {
  const sub = await req.json();
  if (!sub?.endpoint) return Response.json({ error: 'Invalid subscription.' }, { status: 400 });
  await sql`INSERT INTO push_subs (endpoint, sub) VALUES (${sub.endpoint}, ${JSON.stringify(sub)}::jsonb)
    ON CONFLICT (endpoint) DO UPDATE SET sub = EXCLUDED.sub`;
  return Response.json({ ok: true });
}
