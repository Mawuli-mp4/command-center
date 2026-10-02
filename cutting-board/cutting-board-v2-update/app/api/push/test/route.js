import { pushAll } from '@/lib/push';

export async function POST() {
  const r = await pushAll({ title: 'Cutting Board', body: 'Notifications are on. Briefs arrive at 7 am and 3 pm.' });
  return Response.json(r);
}
