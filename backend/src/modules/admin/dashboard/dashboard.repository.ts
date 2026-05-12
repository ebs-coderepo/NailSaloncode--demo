import { prisma } from '../../../shared/db/prismaClient';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Repository — all queries scoped to tenantId
// ─────────────────────────────────────────────────────────────────────────────

export async function getTodayAppointments(tenantId: string, todayStart: Date, todayEnd: Date) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: todayStart, lte: todayEnd },
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      bookedVia: true,
      customer: { select: { name: true, phone: true } },
      staff:    { select: { name: true } },
      service:  { select: { name: true, duration: true, price: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getUpcomingAppointments(tenantId: string, from: Date) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: from },
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
    select: {
      id: true,
      startTime: true,
      status: true,
      customer: { select: { name: true, phone: true } },
      staff:    { select: { name: true } },
      service:  { select: { name: true, price: true } },
    },
    orderBy: { startTime: 'asc' },
    take: 5,
  });
}

export async function getWeekAppointmentCount(tenantId: string, weekStart: Date, weekEnd: Date) {
  return prisma.appointment.count({
    where: {
      tenantId,
      startTime: { gte: weekStart, lte: weekEnd },
      status: { not: 'CANCELLED' },
    },
  });
}

export async function getMonthRevenue(tenantId: string, monthStart: Date, monthEnd: Date) {
  // Sum prices of completed appointments in the period
  const result = await prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: monthStart, lte: monthEnd },
      status: 'COMPLETED',
    },
    select: { service: { select: { price: true } } },
  });
  return result.reduce((sum, a) => sum + parseFloat(a.service.price.toString()), 0);
}

export async function getCustomerCount(tenantId: string) {
  return prisma.customer.count({ where: { tenantId } });
}

export async function getNewCustomersThisMonth(tenantId: string, monthStart: Date) {
  return prisma.customer.count({
    where: { tenantId, createdAt: { gte: monthStart } },
  });
}

export async function getActiveServiceCount(tenantId: string) {
  return prisma.service.count({ where: { tenantId, isActive: true } });
}

export async function getActiveStaffCount(tenantId: string) {
  return prisma.staff.count({ where: { tenantId, isActive: true } });
}

export async function getTopServices(tenantId: string, monthStart: Date) {
  // Count appointments per service this month, return top 5
  const rows = await prisma.appointment.groupBy({
    by: ['serviceId'],
    where: {
      tenantId,
      startTime: { gte: monthStart },
      status: { not: 'CANCELLED' },
    },
    _count: { serviceId: true },
    orderBy: { _count: { serviceId: 'desc' } },
    take: 5,
  });

  if (rows.length === 0) return [];

  // Hydrate with service names
  const serviceIds = rows.map((r) => r.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true, price: true },
  });

  return rows.map((row) => {
    const svc = services.find((s) => s.id === row.serviceId);
    return {
      name: svc?.name ?? 'Unknown',
      price: svc ? parseFloat(svc.price.toString()) : 0,
      bookings: row._count.serviceId,
    };
  });
}

export async function getStatusBreakdown(tenantId: string, todayStart: Date, todayEnd: Date) {
  const rows = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      tenantId,
      startTime: { gte: todayStart, lte: todayEnd },
    },
    _count: { status: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count.status]));
}
