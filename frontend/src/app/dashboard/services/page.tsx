import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ServicesClient from './ServicesClient';
import type { ServiceDto } from '@/lib/services.api';
import { getSession, API_URL } from '@/lib/session';

export const metadata: Metadata = { title: 'Services' };

async function fetchInitialServices(token: string): Promise<ServiceDto[]> {
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/v1/admin/services`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data.services : [];
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const token    = cookies().get('auth_token')?.value ?? '';
  const session  = getSession();
  const services = await fetchInitialServices(token);
  const role     = session?.role ?? 'STAFF';

  return (
    <div className="p-8 max-w-5xl">
      <ServicesClient initialServices={services} role={role} />
    </div>
  );
}
