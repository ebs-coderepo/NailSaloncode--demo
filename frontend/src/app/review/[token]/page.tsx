'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type ApptInfo = {
  alreadyReviewed: boolean;
  status: string;
  customer: string;
  staff: string;
  service: string;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo]       = useState<ApptInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/public/review/${token}`);
      const json = await res.json();
      if (json.success) setInfo(json.data);
      else setError(json.message ?? 'Not found');
    } catch {
      setError('Could not load review page.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/public/review/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || null }),
      });
      const json = await res.json();
      if (json.success) setDone(true);
      else setError(json.message ?? 'Failed to submit review.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading…</p>
    </div>
  );

  if (error && !info) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Review Link Invalid</h1>
        <p className="text-gray-500">{error}</p>
        <Link href="/" className="mt-4 inline-block text-pink-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-5xl mb-4">🌟</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
        <p className="text-gray-500">Your review has been submitted and will appear on our site shortly.</p>
        <Link href="/" className="mt-6 inline-block bg-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-pink-700 transition">
          Back to Home
        </Link>
      </div>
    </div>
  );

  if (info?.alreadyReviewed) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Already Reviewed</h1>
        <p className="text-gray-500">You've already submitted a review for this appointment.</p>
        <Link href="/" className="mt-4 inline-block text-pink-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  if (info?.status !== 'COMPLETED') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Not Yet Complete</h1>
        <p className="text-gray-500">Reviews can only be submitted after your appointment has been completed.</p>
        <Link href="/" className="mt-4 inline-block text-pink-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-center">
          <span className="font-semibold">Leave a Review</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-8 space-y-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">How was your experience with</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{info?.staff}</p>
            <p className="text-gray-500 text-sm">{info?.service}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-sm text-gray-500">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share your experience (optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={800}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              placeholder="What did you love? What could be improved?"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/800</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full bg-pink-600 text-white py-3 rounded-xl font-medium hover:bg-pink-700 transition disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </main>
    </div>
  );
}
