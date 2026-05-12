import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession, API_URL } from '@/lib/session';
import ReviewsClient from './ReviewsClient';

export const metadata: Metadata = { title: 'Reviews' };

async function fetchReviews(token: string) {
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/v1/admin/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export default async function ReviewsPage() {
  const token   = cookies().get('auth_token')?.value ?? '';
  const session = getSession();
  const reviews = await fetchReviews(token);
  const role    = session?.role ?? 'STAFF';

  return (
    <div className="p-8">
      <ReviewsClient initialReviews={reviews} token={token} role={role} />
    </div>
  );
}
