import {
  getTodayAppointments,
  getUpcomingAppointments,
  getWeekAppointmentCount,
  getMonthRevenue,
  getCustomerCount,
  getNewCustomersThisMonth,
  getActiveServiceCount,
  getActiveStaffCount,
  getTopServices,
  getStatusBreakdown,
} from './dashboard.repository';

// ─────────────────────────────────────────────────────────────────────────────
// Date range helpers
// All appointments are stored in UTC. We calculate day/week/month boundaries
// in UTC here. Timezone-aware math will be added when the tenant tz is applied.
// ─────────────────────────────────────────────────────────────────────────────

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported service function — single call fetches everything the dashboard needs
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardStats(tenantId: string) {
  const today = getTodayRange();
  const week  = getWeekRange();
  const month = getMonthRange();

  // All queries run in parallel — dashboard load time = slowest single query
  const [
    todayAppointments,
    upcomingAppointments,
    weekCount,
    monthRevenue,
    customerCount,
    newCustomers,
    serviceCount,
    staffCount,
    topServices,
    statusBreakdown,
  ] = await Promise.all([
    getTodayAppointments(tenantId, today.start, today.end),
    getUpcomingAppointments(tenantId, new Date()),
    getWeekAppointmentCount(tenantId, week.start, week.end),
    getMonthRevenue(tenantId, month.start, month.end),
    getCustomerCount(tenantId),
    getNewCustomersThisMonth(tenantId, month.start),
    getActiveServiceCount(tenantId),
    getActiveStaffCount(tenantId),
    getTopServices(tenantId, month.start),
    getStatusBreakdown(tenantId, today.start, today.end),
  ]);

  // Today's revenue = sum of completed appointments today
  const todayRevenue = todayAppointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + parseFloat(a.service.price.toString()), 0);

  return {
    // ── Key metrics ──────────────────────────────────────────────────────────
    metrics: {
      appointmentsToday:   todayAppointments.length,
      appointmentsThisWeek: weekCount,
      revenueToday:        formatCurrency(todayRevenue),
      revenueThisMonth:    formatCurrency(monthRevenue),
      totalCustomers:      customerCount,
      newCustomersThisMonth: newCustomers,
      activeServices:      serviceCount,
      staffCount,
    },

    // ── Today's status breakdown ─────────────────────────────────────────────
    todayStatus: {
      confirmed:  statusBreakdown['CONFIRMED']  ?? 0,
      completed:  statusBreakdown['COMPLETED']  ?? 0,
      cancelled:  statusBreakdown['CANCELLED']  ?? 0,
      noShow:     statusBreakdown['NO_SHOW']     ?? 0,
      pending:    statusBreakdown['PENDING']     ?? 0,
    },

    // ── Schedule ─────────────────────────────────────────────────────────────
    todaySchedule: todayAppointments.map((a) => ({
      id:          a.id,
      time:        formatTime(a.startTime),
      endTime:     formatTime(a.endTime),
      customer:    a.customer.name,
      phone:       a.customer.phone,
      service:     a.service.name,
      duration:    a.service.duration,
      staff:       a.staff.name,
      status:      a.status,
      bookedVia:   a.bookedVia,
    })),

    // ── Upcoming (next 5 after now) ───────────────────────────────────────────
    upcoming: upcomingAppointments.map((a) => ({
      id:       a.id,
      dateTime: formatDateTime(a.startTime),
      customer: a.customer.name,
      service:  a.service.name,
      staff:    a.staff.name,
      status:   a.status,
    })),

    // ── Top services this month ───────────────────────────────────────────────
    topServices,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters (pure — easy to unit test)
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
}
