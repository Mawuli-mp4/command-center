import { NextResponse } from 'next/server';

export function middleware(req) {
  const key = process.env.DASHBOARD_KEY;
  if (!key) return NextResponse.next();
  if (req.cookies.get('dk')?.value === key) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in again' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!login|api/login|api/cron|manifest.webmanifest|sw.js|icons|_next|favicon.ico).*)'],
};
