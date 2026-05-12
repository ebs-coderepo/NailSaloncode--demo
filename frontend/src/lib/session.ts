// Server-side session utility — safe to import in Server Components and Route Handlers.
// Reads the auth_token cookie and decodes the JWT payload (no crypto verify —
// the backend verifies on every API call; this is just for rendering decisions).

import { cookies } from 'next/headers';

export type SessionUser = {
  userId:   string;
  tenantId: string;
  role:     'OWNER' | 'MANAGER' | 'STAFF';
  name:     string;
  staffId?: string;
};

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;

  try {
    const [, payloadB64] = token.split('.');
    // atob works in Node 18+; Buffer.from also works
    const raw     = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(raw);

    return {
      userId:   payload.sub,
      tenantId: payload.tenantId,
      role:     payload.role,
      name:     payload.name,
      staffId:  payload.staffId,
    };
  } catch {
    return null;
  }
}

// The API key is still needed for server-side fetches that use the tools endpoint.
export const SALON_API_KEY = process.env['SALON_API_KEY'] ?? '';
export const API_URL       = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// Build auth headers for server-side fetch calls using JWT from cookie.
export function serverAuthHeaders(token: string) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
