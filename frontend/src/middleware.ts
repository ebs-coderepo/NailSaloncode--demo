import { NextRequest, NextResponse } from 'next/server';

// Decode JWT payload without crypto verification — just for routing decisions.
// Security is enforced by the backend on every API call.
function decodeJwt(token: string): { role?: string } | null {
  try {
    const [, payloadB64] = token.split('.');
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token   = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isLoginPage     = pathname === '/login';
  const isDashboardPage = pathname.startsWith('/dashboard');

  // ── Unauthenticated → redirect to login ───────────────────────────────────
  if (!token && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ── Already logged in → don't show login page ─────────────────────────────
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Role-based page guards ─────────────────────────────────────────────────
  if (token && isDashboardPage) {
    const payload = decodeJwt(token);
    const role    = payload?.role ?? '';

    // STAFF cannot access these pages — redirect to their calendar
    const ownerOnlyPaths = [
      '/dashboard/customers',
      '/dashboard/voice',
      '/dashboard/settings',
    ];
    const managerPaths = [
      '/dashboard/appointments',
    ];

    if (role === 'STAFF') {
      // STAFF landing on /dashboard overview → send to calendar
      if (pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard/calendar', request.url));
      }
      if ([...ownerOnlyPaths, ...managerPaths].some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL('/dashboard/calendar', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
