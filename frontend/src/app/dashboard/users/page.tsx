import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, API_URL } from '@/lib/session';
import UsersClient from './UsersClient';

export const metadata: Metadata = { title: 'Team Accounts' };

async function fetchUsers(token: string) {
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data.users : [];
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== 'OWNER') redirect('/dashboard');

  const token = (await cookies()).get('auth_token')?.value ?? '';
  const users = await fetchUsers(token);

  return (
    <div className="p-8">
      <UsersClient initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
