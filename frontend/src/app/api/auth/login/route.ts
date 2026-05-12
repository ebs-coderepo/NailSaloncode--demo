import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward credentials to Express backend
    const backendRes = await fetch(`${API_URL}/v1/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!data.success) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    // Set the JWT as a cookie so Next.js middleware and server components can read it.
    // SameSite=Lax protects against CSRF; Secure in production.
    const response = NextResponse.json(data);
    response.cookies.set('auth_token', data.data.token, {
      httpOnly: false,   // needs to be readable by client JS for Bearer header
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 7, // 7 days
      secure:   process.env['NODE_ENV'] === 'production',
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Login failed', data: null, errorCode: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
