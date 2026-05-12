import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, API_URL } from '@/lib/session';
import FinanceClient from './FinanceClient';

export const metadata: Metadata = { title: 'Finance' };

async function fetchFinanceSummary(token: string) {
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/v1/admin/finance/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function FinancePage() {
  const session = await getSession();
  if (!session || session.role === 'STAFF') redirect('/dashboard');

  const token = (await cookies()).get('auth_token')?.value ?? '';
  const data  = await fetchFinanceSummary(token);

  return (
    <div className="p-8">
      <FinanceClient initialData={data} />
    </div>
  );
}
