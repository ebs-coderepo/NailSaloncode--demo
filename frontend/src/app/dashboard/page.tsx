import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = { title: 'Overview' };

// ─────────────────────────────────────────────────────────────────────────────
// Types matching the backend dashboard stats response
// ─────────────────────────────────────────────────────────────────────────────

type Metrics = {
  appointmentsToday: number;
  appointmentsThisWeek: number;
  revenueToday: string;
  revenueThisMonth: string;
  totalCustomers: number;
  newCustomersThisMonth: number;
  activeServices: number;
  staffCount: number;
};

type TodayStatus = {
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
};

type ScheduleItem = {
  id: string;
  time: string;
  endTime: string;
  customer: string;
  phone: string;
  service: string;
  duration: number;
  staff: string;
  status: string;
  bookedVia: string;
};

type UpcomingItem = {
  id: string;
  dateTime: string;
  customer: string;
  service: string;
  staff: string;
  status: string;
};

type TopService = {
  name: string;
  price: number;
  bookings: number;
};

type DashboardStats = {
  metrics: Metrics;
  todayStatus: TodayStatus;
  todaySchedule: ScheduleItem[];
  upcoming: UpcomingItem[];
  topServices: TopService[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching (Server Component — runs on the server, never in the browser)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchStats(): Promise<DashboardStats | null> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  const token  = (await cookies()).get('auth_token')?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${apiUrl}/v1/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? (json.data as DashboardStats) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardOverviewPage() {
  const stats = await fetchStats();
  const m = stats?.metrics;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-8 max-w-6xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, Luxe Nails & Spa</h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Top stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Appointments Today"
          value={m ? String(m.appointmentsToday) : '—'}
          sub={m ? `${m.appointmentsThisWeek} this week` : 'Loading…'}
          icon="📅"
          color="bg-brand-50 text-brand-700"
        />
        <StatCard
          label="Revenue Today"
          value={m ? m.revenueToday : '—'}
          sub={m ? `${m.revenueThisMonth} this month` : 'Loading…'}
          icon="💰"
          color="bg-green-50 text-green-700"
        />
        <StatCard
          label="Total Customers"
          value={m ? String(m.totalCustomers) : '—'}
          sub={m ? `+${m.newCustomersThisMonth} this month` : 'Loading…'}
          icon="👥"
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Staff on Roster"
          value={m ? String(m.staffCount) : '—'}
          sub={m ? `${m.activeServices} active services` : 'Loading…'}
          icon="💅"
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* ── Today's status breakdown ──────────────────────────────────────────── */}
      {stats && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Today&apos;s Appointments by Status</h2>
          <div className="flex flex-wrap gap-3">
            <StatusPill label="Confirmed" count={stats.todayStatus.confirmed} color="bg-blue-100 text-blue-800" />
            <StatusPill label="Completed" count={stats.todayStatus.completed} color="bg-green-100 text-green-800" />
            <StatusPill label="Pending"   count={stats.todayStatus.pending}   color="bg-yellow-100 text-yellow-800" />
            <StatusPill label="Cancelled" count={stats.todayStatus.cancelled} color="bg-red-100 text-red-800" />
            <StatusPill label="No Show"   count={stats.todayStatus.noShow}    color="bg-gray-100 text-gray-600" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Today's schedule ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Today&apos;s Schedule
            {stats && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {stats.todaySchedule.length} appointment{stats.todaySchedule.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>

          {!stats ? (
            <EmptyState icon="📅" message="Could not load today's schedule. Make sure the backend is running." />
          ) : stats.todaySchedule.length === 0 ? (
            <EmptyState icon="🌿" message="No appointments scheduled for today" />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {stats.todaySchedule.map((appt) => (
                <div key={appt.id} className="flex items-start gap-4 py-3">
                  {/* Time */}
                  <div className="w-20 flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">{appt.time}</p>
                    <p className="text-xs text-gray-400">{appt.endTime}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{appt.customer}</p>
                    <p className="text-xs text-gray-500">{appt.service} · {appt.staff}</p>
                    <p className="text-xs text-gray-400">{appt.phone}</p>
                  </div>

                  {/* Status + channel */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={appt.status} />
                    {appt.bookedVia === 'voice' && (
                      <span className="text-xs text-gray-400">🎙 Voice AI</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Top services this month */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Services This Month</h2>
            {!stats || stats.topServices.length === 0 ? (
              <EmptyState icon="💅" message="No bookings recorded yet" small />
            ) : (
              <div className="flex flex-col gap-3">
                {stats.topServices.map((svc, i) => (
                  <div key={svc.name} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                      <p className="text-xs text-gray-400">
                        {svc.bookings} booking{svc.bookings !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-brand-700">
                      ${svc.price.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming appointments */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Upcoming</h2>
            {!stats || stats.upcoming.length === 0 ? (
              <EmptyState icon="🗓" message="No upcoming appointments" small />
            ) : (
              <div className="flex flex-col gap-3">
                {stats.upcoming.map((appt) => (
                  <div key={appt.id} className="flex flex-col gap-0.5">
                    <p className="text-xs text-gray-400">{appt.dateTime}</p>
                    <p className="text-sm font-medium text-gray-900">{appt.customer}</p>
                    <p className="text-xs text-gray-500">{appt.service} · {appt.staff}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub: string; icon: string; color: string;
}) {
  return (
    <div className="card p-5">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium mb-3 ${color}`}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${color}`}>
      <span className="text-lg font-bold">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-blue-50 text-blue-700',
    COMPLETED: 'bg-green-50 text-green-700',
    CANCELLED: 'bg-red-50 text-red-700',
    NO_SHOW:   'bg-gray-100 text-gray-500',
    PENDING:   'bg-yellow-50 text-yellow-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
    </span>
  );
}

function EmptyState({ icon, message, small }: { icon: string; message: string; small?: boolean }) {
  return (
    <div className={`text-center ${small ? 'py-4' : 'py-8'}`}>
      <p className={small ? 'text-xl' : 'text-3xl'}>{icon}</p>
      <p className="text-xs text-gray-400 mt-2">{message}</p>
    </div>
  );
}
