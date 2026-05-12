'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api.client';

type FinanceSummary = {
  overview: {
    totalRevenue: string;
    thisMonthRevenue: string;
    lastMonthRevenue: string;
    todayRevenue: string;
    pendingRevenue: string;
    monthGrowthPct: number | null;
    totalTransactions: number;
  };
  methodBreakdown: { method: string; amount: string; amountRaw: number }[];
  monthlyTrend: { label: string; revenue: number; count: number }[];
  recentTransactions: {
    id: string;
    amount: string;
    method: string;
    paidAt: string;
    appointment: { startTime: string; customer: string; service: string; staff: string };
  }[];
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card (manual)', STRIPE: 'Stripe', SQUARE: 'Square', PAYPAL: 'PayPal', OTHER: 'Other',
};
const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700', CARD: 'bg-blue-100 text-blue-700',
  STRIPE: 'bg-purple-100 text-purple-700', SQUARE: 'bg-sky-100 text-sky-700',
  PAYPAL: 'bg-yellow-100 text-yellow-700', OTHER: 'bg-gray-100 text-gray-700',
};

type Props = { initialData: FinanceSummary | null };

export default function FinanceClient({ initialData }: Props) {
  const [data, setData] = useState<FinanceSummary | null>(initialData);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await apiFetch<FinanceSummary>('/api/v1/admin/finance/summary');
    if (res.success) setData(res.data);
    setLoading(false);
  }

  const maxMonthRevenue = data
    ? Math.max(...data.monthlyTrend.map((m) => m.revenue), 1)
    : 1;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Revenue, payments, and transaction history.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary text-sm">
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!data ? (
        <div className="card p-12 text-center text-gray-400">No finance data available yet. Record your first payment on the Appointments page.</div>
      ) : (
        <div className="space-y-6">

          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Today" value={data.overview.todayRevenue} sub="collected today" color="blue" />
            <StatCard
              label="This Month"
              value={data.overview.thisMonthRevenue}
              sub={data.overview.monthGrowthPct !== null
                ? `${data.overview.monthGrowthPct >= 0 ? '+' : ''}${data.overview.monthGrowthPct}% vs last month`
                : `Last month: ${data.overview.lastMonthRevenue}`}
              color={data.overview.monthGrowthPct !== null && data.overview.monthGrowthPct >= 0 ? 'green' : 'red'}
            />
            <StatCard label="Total Revenue" value={data.overview.totalRevenue} sub={`${data.overview.totalTransactions} transactions`} color="purple" />
            <StatCard label="Pending" value={data.overview.pendingRevenue} sub="from confirmed bookings" color="amber" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Monthly trend bar chart */}
            <div className="lg:col-span-2 card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
              <div className="flex items-end gap-2 h-40">
                {data.monthlyTrend.map((m, i) => {
                  const height = maxMonthRevenue > 0 ? (m.revenue / maxMonthRevenue) * 100 : 0;
                  const isLast = i === data.monthlyTrend.length - 1;
                  return (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs text-gray-500 font-medium">{m.count > 0 ? m.count : ''}</div>
                      <div className="w-full flex items-end" style={{ height: '120px' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all ${isLast ? 'bg-brand-600' : 'bg-brand-200'}`}
                          style={{ height: `${Math.max(height, m.revenue > 0 ? 4 : 0)}%` }}
                          title={`${m.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(m.revenue)}`}
                        />
                      </div>
                      <div className="text-xs text-gray-400">{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Method breakdown */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">This Month by Method</h2>
              {data.methodBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No payments recorded this month.</p>
              ) : (
                <div className="space-y-3">
                  {data.methodBreakdown.map((mb) => (
                    <div key={mb.method} className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[mb.method] ?? 'bg-gray-100 text-gray-700'}`}>
                        {METHOD_LABELS[mb.method] ?? mb.method}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{mb.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            {data.recentTransactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 italic">No transactions yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Customer</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Service</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Method</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(t.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{t.appointment.customer}</td>
                      <td className="px-5 py-3 text-gray-500">{t.appointment.service}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[t.method] ?? 'bg-gray-100 text-gray-700'}`}>
                          {METHOD_LABELS[t.method] ?? t.method}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{t.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'blue' | 'green' | 'purple' | 'amber' | 'red' }) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${colorMap[color]}`}>{sub}</p>
    </div>
  );
}
