import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import CustomersClient from './CustomersClient';

export const metadata: Metadata = { title: 'Customers' };

async function fetchCustomers(token: string) {
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/v1/admin/customers`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data.customers : [];
  } catch {
    return [];
  }
}

export default async function CustomersPage() {
  const token    = (await cookies()).get('auth_token')?.value ?? '';
  const session  = await getSession();
  const role     = session?.role ?? 'STAFF';
  const customers = await fetchCustomers(token);

  return (
    <div className="p-8 max-w-5xl">
      <CustomersClient initialCustomers={customers} role={role} />
    </div>
  );
}
