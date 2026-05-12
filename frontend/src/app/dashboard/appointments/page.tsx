import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import AppointmentsClient from './AppointmentsClient';

export const metadata: Metadata = { title: 'Appointments' };

async function fetchAppointments(token: string) {
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/v1/admin/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data.appointments : [];
  } catch {
    return [];
  }
}

async function fetchStaff(token: string) {
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/v1/admin/staff`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data.staff : [];
  } catch {
    return [];
  }
}

export default async function AppointmentsPage() {
  const token   = (await cookies()).get('auth_token')?.value ?? '';
  const session = await getSession();
  const role    = session?.role ?? 'STAFF';

  const [appointments, staffList] = await Promise.all([
    fetchAppointments(token),
    role !== 'STAFF' ? fetchStaff(token) : Promise.resolve([]),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <AppointmentsClient
        initialAppointments={appointments}
        staffList={staffList}
        role={role}
      />
    </div>
  );
}
