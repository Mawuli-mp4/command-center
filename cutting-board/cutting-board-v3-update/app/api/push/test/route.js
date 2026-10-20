import { pushAll } from '@/lib/push';

export async function POST() {
  const r = await pushAll({ title: 'Cutting Board', body: 'Notifications are on. Briefs arrive around 10 am, and 8 pm on weekdays.' });
  return Response.json(r);
}
