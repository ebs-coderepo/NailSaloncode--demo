// Shared client-side fetch helper.
// Reads the JWT from the auth_token cookie and injects it as Bearer.
// Every Client Component that calls the API imports this instead of rolling its own.

function getToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<{ success: boolean; message: string; data: T; errorCode: string | null }> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  return res.json();
}
