import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import VoiceClient from './VoiceClient';

export const metadata: Metadata = { title: 'Voice AI' };

async function fetchVoiceConfig(token: string) {
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/v1/admin/voice-config`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function VoicePage() {
  const token  = cookies().get('auth_token')?.value ?? '';
  const session = getSession();
  const config  = await fetchVoiceConfig(token);
  const role    = session?.role ?? 'STAFF';

  return (
    <div className="p-8 max-w-2xl">
      <VoiceClient initialConfig={config} role={role} />
    </div>
  );
}
