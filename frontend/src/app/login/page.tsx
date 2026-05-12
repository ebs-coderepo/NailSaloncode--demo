'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.message ?? 'Login failed');
          return;
        }

        // Cookie is set by the Route Handler — redirect based on role
        const role = data.data?.user?.role;
        router.push(role === 'STAFF' ? '/dashboard/calendar' : '/dashboard');
        router.refresh();
      } catch {
        setError('Network error — is the backend running?');
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Luxe Nails & Spa</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-700">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@luxenails.com"
                required
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors mt-1"
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Demo accounts</p>
            <div className="flex flex-col gap-1.5 text-xs text-gray-500">
              <div className="flex justify-between bg-gray-50 rounded px-2 py-1.5">
                <span className="font-medium text-brand-700">Owner</span>
                <span>owner@luxenails.com / password123</span>
              </div>
              <div className="flex justify-between bg-gray-50 rounded px-2 py-1.5">
                <span className="font-medium text-blue-700">Staff</span>
                <span>jessica@luxenails.com / password123</span>
              </div>
              <div className="flex justify-between bg-gray-50 rounded px-2 py-1.5">
                <span className="font-medium text-blue-700">Staff</span>
                <span>maria@luxenails.com / password123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
