import webpush from 'web-push';
import { sql } from './db';

let ready = false;
function configure() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  ready = true;
  return true;
}

export async function pushAll(payload) {
  if (!configure()) return { sent: 0, reason: 'VAPID keys missing' };
  const subs = await sql`SELECT endpoint, sub FROM push_subs`;
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.sub, JSON.stringify(payload));
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await sql`DELETE FROM push_subs WHERE endpoint = ${s.endpoint}`;
      }
    }
  }
  return { sent };
}
