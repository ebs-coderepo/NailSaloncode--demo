import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = { title: 'Settings' };

async function fetchSettings(token: string) {
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const token    = cookies().get('auth_token')?.value ?? '';
  const session  = getSession();
  const settings = await fetchSettings(token);
  const role     = session?.role ?? 'STAFF';

  return (
    <div className="p-8">
      <SettingsClient initialSettings={settings} role={role} />
    </div>
  );
}
