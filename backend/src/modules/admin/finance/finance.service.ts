import { prisma } from '../../../shared/db/prismaClient';
import { PaymentStatus } from '@prisma/client';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export async function getFinanceSummary(tenantId: string) {
  const now    = new Date();
  const today  = startOfDay(now);
  const thisMonth = startOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd   = startOfMonth(now);

  const [allPayments, thisMonthPayments, lastMonthPayments, todayPayments] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId, status: PaymentStatus.COMPLETED },
      select: { amount: true, method: true, currency: true, paidAt: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { tenantId, status: PaymentStatus.COMPLETED, createdAt: { gte: thisMonth } },
      select: { amount: true, method: true },
    }),
    prisma.payment.findMany({
      where: { tenantId, status: PaymentStatus.COMPLETED, createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
      select: { amount: true },
    }),
    prisma.payment.findMany({
      where: { tenantId, status: PaymentStatus.COMPLETED, createdAt: { gte: today } },
      select: { amount: true },
    }),
  ]);

  const sum = (rows: { amount: any }[]) =>
    rows.reduce((acc, r) => acc + parseFloat(r.amount.toString()), 0);

  const totalRevenue     = sum(allPayments);
  const thisMonthRevenue = sum(thisMonthPayments);
  const lastMonthRevenue = sum(lastMonthPayments);
  const todayRevenue     = sum(todayPayments);

  const monthGrowth = lastMonthRevenue === 0
    ? null
    : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

  // Payment method breakdown for this month
  const methodBreakdown = thisMonthPayments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + parseFloat(p.amount.toString());
    return acc;
  }, {} as Record<string, number>);

  // Monthly trend — last 6 months
  const months: { label: string; revenue: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const mEnd   = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i + 1, 1));
    const mPayments = allPayments.filter(
      (p) => p.createdAt >= mStart && p.createdAt < mEnd,
    );
    months.push({
      label:   mStart.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      revenue: sum(mPayments),
      count:   mPayments.length,
    });
  }

  // Upcoming revenue (CONFIRMED appointments with service prices — not yet paid)
  const upcomingAppointments = await prisma.appointment.findMany({
    where: { tenantId, status: { in: ['CONFIRMED', 'PENDING'] }, payment: null },
    select: { service: { select: { price: true } } },
  });
  const pendingRevenue = upcomingAppointments.reduce(
    (acc, a) => acc + parseFloat(a.service.price.toString()),
    0,
  );

  // Recent transactions
  const recentPayments = await prisma.payment.findMany({
    where: { tenantId, status: PaymentStatus.COMPLETED },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true, amount: true, currency: true, method: true, paidAt: true, createdAt: true,
      appointment: {
        select: {
          startTime: true,
          customer: { select: { name: true } },
          service:  { select: { name: true } },
          staff:    { select: { name: true } },
        },
      },
    },
  });

  const currency = 'USD';

  return {
    overview: {
      totalRevenue:      formatCurrency(totalRevenue, currency),
      thisMonthRevenue:  formatCurrency(thisMonthRevenue, currency),
      lastMonthRevenue:  formatCurrency(lastMonthRevenue, currency),
      todayRevenue:      formatCurrency(todayRevenue, currency),
      pendingRevenue:    formatCurrency(pendingRevenue, currency),
      monthGrowthPct:    monthGrowth !== null ? parseFloat(monthGrowth.toFixed(1)) : null,
      totalTransactions: allPayments.length,
    },
    methodBreakdown: Object.entries(methodBreakdown).map(([method, amount]) => ({
      method,
      amount: formatCurrency(amount, currency),
      amountRaw: amount,
    })),
    monthlyTrend: months,
    recentTransactions: recentPayments.map((p) => ({
      id:     p.id,
      amount: formatCurrency(parseFloat(p.amount.toString()), p.currency),
      method: p.method,
      paidAt: (p.paidAt ?? p.createdAt).toISOString(),
      appointment: {
        startTime: p.appointment.startTime.toISOString(),
        customer:  p.appointment.customer.name,
        service:   p.appointment.service.name,
        staff:     p.appointment.staff.name,
      },
    })),
  };
}
