'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  isVisible: boolean;
  createdAt: string;
  staff: { id: string; name: string };
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReviewsClient({
  initialReviews,
  token,
  role,
}: {
  initialReviews: Review[];
  token: string;
  role: string;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [filter, setFilter]   = useState<'all' | 'visible' | 'hidden'>('all');
  const [busy, setBusy]       = useState<string | null>(null);

  const canModerate = role === 'OWNER' || role === 'MANAGER';

  const patch = async (id: string, isVisible: boolean) => {
    setBusy(id);
    try {
      const res = await fetch(`${API_URL}/v1/admin/reviews/${id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isVisible }),
      });
      const json = await res.json();
      if (json.success) {
        setReviews((prev) => prev.map((r) => r.id === id ? { ...r, isVisible } : r));
      }
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return;
    setBusy(id);
    try {
      const res = await fetch(`${API_URL}/v1/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setReviews((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusy(null);
    }
  };

  const visible = reviews.filter((r) =>
    filter === 'all' ? true : filter === 'visible' ? r.isVisible : !r.isVisible
  );

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">{reviews.length} total · avg {avgRating} ★</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'visible', 'hidden'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                filter === f
                  ? 'bg-pink-600 border-pink-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Reviews appear here after customers submit them post-appointment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-xl border p-5 ${
                !review.isVisible ? 'opacity-60 border-dashed' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{review.customerName}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <Stars rating={review.rating} />
                    {!review.isVisible && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 text-sm leading-relaxed mb-2">{review.comment}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    For {review.staff.name} · {fmtDate(review.createdAt)}
                  </p>
                </div>

                {canModerate && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => patch(review.id, !review.isVisible)}
                      disabled={busy === review.id}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {review.isVisible ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => remove(review.id)}
                      disabled={busy === review.id}
                      className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
