import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import CalendarClient from './CalendarClient';

export const metadata: Metadata = { title: 'Calendar' };

async function fetchCalendarData(token: string, year: number, month: number, staffId?: string) {
  if (!token) return null;
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (staffId) params.set('staffId', staffId);

  try {
    const res = await fetch(`${API_URL}/v1/admin/calendar?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function CalendarPage() {
  const token   = (await cookies()).get('auth_token')?.value ?? '';
  const session = await getSession();

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  // STAFF always sees their own calendar on initial load
  const staffIdFilter = session?.role === 'STAFF' ? session.staffId : undefined;

  const data = await fetchCalendarData(token, year, month, staffIdFilter);

  return (
    <div className="p-8 max-w-6xl">
      <CalendarClient
        initialData={data}
        role={session?.role ?? 'STAFF'}
        staffId={session?.staffId ?? null}
        token={token}
      />
    </div>
  );
}
