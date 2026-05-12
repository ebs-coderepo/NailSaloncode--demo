import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PayClient from './PayClient';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const metadata: Metadata = { title: 'Pay for your appointment' };

async function fetchPaymentInfo(token: string) {
  try {
    const res = await fetch(`${API_URL}/v1/public/pay/${token}`, { cache: 'no-store' });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function PayPage({ params }: { params: { token: string } }) {
  const info = await fetchPaymentInfo(params.token);
  if (!info) notFound();

  return <PayClient token={params.token} info={info} />;
}
