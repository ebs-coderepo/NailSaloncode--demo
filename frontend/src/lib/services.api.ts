// ─────────────────────────────────────────────────────────────────────────────
// Services API client — used by Client Components only.
// Reads JWT from the auth_token cookie and sends it as a Bearer token.
// The proxy in next.config.mjs forwards /api/v1/* → Express backend /v1/*.
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceDto = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  durationDisplay: string;
  price: string;
  priceRaw: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceFormValues = {
  name: string;
  description: string;
  duration: number;
  price: number;
};

function getToken(): string {
  // Read JWT from cookie — same domain, set as non-httpOnly so JS can read it
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

export async function apiListServices(): Promise<ServiceDto[]> {
  const res = await fetch('/api/v1/admin/services', { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data.services;
}

export async function apiCreateService(values: ServiceFormValues): Promise<ServiceDto> {
  const res = await fetch('/api/v1/admin/services', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name:        values.name,
      description: values.description || undefined,
      duration:    values.duration,
      price:       values.price,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function apiUpdateService(
  id: string,
  values: Partial<ServiceFormValues> & { isActive?: boolean },
): Promise<ServiceDto> {
  const res = await fetch(`/api/v1/admin/services/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(values),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

export async function apiDeleteService(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/services/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}
