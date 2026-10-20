import { NextResponse } from 'next/server';

export async function POST(req) {
  const { key } = await req.json().catch(() => ({}));
  if (!process.env.DASHBOARD_KEY || key !== process.env.DASHBOARD_KEY) {
    return NextResponse.json({ error: 'That passcode doesn’t match.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('dk', key, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}
