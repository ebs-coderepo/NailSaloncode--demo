import { prisma } from '../../../shared/db/prismaClient';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Repository
// Provides appointments, blocked times, and schedule overrides for a month.
// ─────────────────────────────────────────────────────────────────────────────

export async function getMonthAppointments(
  tenantId: string,
  monthStart: Date,
  monthEnd: Date,
  staffId?: string,
) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      startTime: { gte: monthStart, lte: monthEnd },
      status: { not: 'CANCELLED' },
      ...(staffId && { staffId }),
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      bookedVia: true,
      customer: { select: { name: true, phone: true } },
      staff:    { select: { id: true, name: true } },
      service:  { select: { name: true, duration: true, price: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getMonthBlockedTimes(
  tenantId: string,
  monthStart: Date,
  monthEnd: Date,
  staffId?: string,
) {
  return prisma.blockedTime.findMany({
    where: {
      tenantId,
      startTime: { gte: monthStart, lte: monthEnd },
      ...(staffId && { staffId }),
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      reason: true,
      staff: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getMonthOverrides(
  tenantId: string,
  monthStart: Date,
  monthEnd: Date,
  staffId?: string,
) {
  return prisma.scheduleOverride.findMany({
    where: {
      tenantId,
      date: { gte: monthStart, lte: monthEnd },
      ...(staffId && { staffId }),
    },
    select: {
      id: true,
      date: true,
      isWorking: true,
      startTime: true,
      endTime: true,
      note: true,
      staff: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  });
}

// ── Block (break/meeting) ─────────────────────────────────────────────────────

export async function createBlock(
  tenantId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  reason?: string,
) {
  return prisma.blockedTime.create({
    data: { tenantId, staffId, startTime, endTime, reason: reason ?? null },
    select: { id: true, startTime: true, endTime: true, reason: true },
  });
}

export async function deleteBlock(tenantId: string, id: string) {
  const block = await prisma.blockedTime.findFirst({ where: { id, tenantId } });
  if (!block) return false;
  await prisma.blockedTime.delete({ where: { id } });
  return true;
}

// ── Schedule override (holiday / different hours) ────────────────────────────

export async function createOverride(
  tenantId: string,
  staffId: string,
  date: Date,
  isWorking: boolean,
  note?: string,
  startTime?: string,
  endTime?: string,
) {
  return prisma.scheduleOverride.upsert({
    where: { staffId_date: { staffId, date } },
    update: { isWorking, note: note ?? null, startTime: startTime ?? null, endTime: endTime ?? null },
    create: { tenantId, staffId, date, isWorking, note: note ?? null, startTime: startTime ?? null, endTime: endTime ?? null },
    select: { id: true, date: true, isWorking: true, note: true, startTime: true, endTime: true },
  });
}

export async function deleteOverride(tenantId: string, id: string) {
  const override = await prisma.scheduleOverride.findFirst({ where: { id, tenantId } });
  if (!override) return false;
  await prisma.scheduleOverride.delete({ where: { id } });
  return true;
}

// ── Staff list (for "All Staff" selector) ────────────────────────────────────

export async function getActiveStaff(tenantId: string) {
  return prisma.staff.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}
