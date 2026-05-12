import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import StaffClient from './StaffClient';

export const metadata: Metadata = { title: 'Staff' };

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

async function fetchMyProfile(token: string) {
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/v1/admin/staff/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchServices(token: string) {
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

export default async function StaffPage() {
  const token   = (await cookies()).get('auth_token')?.value ?? '';
  const session = await getSession();
  const role    = session?.role ?? 'STAFF';

  const [staffList, myProfile, services] = await Promise.all([
    role !== 'STAFF' ? fetchStaff(token) : Promise.resolve([]),
    role === 'STAFF' ? fetchMyProfile(token) : Promise.resolve(null),
    fetchServices(token),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <StaffClient
        initialStaff={staffList}
        myProfile={myProfile}
        allServices={services}
        role={role}
      />
    </div>
  );
}
