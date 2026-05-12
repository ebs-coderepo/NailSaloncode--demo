import { prisma } from '../../../shared/db/prismaClient';
import { AppointmentStatus } from '@prisma/client';

const APPT_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  notes: true,
  bookedVia: true,
  cancelledAt: true,
  cancelReason: true,
  cancelToken: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, phone: true, email: true } },
  staff:    { select: { id: true, name: true } },
  service:  { select: { id: true, name: true, duration: true, price: true } },
} as const;

export type AppointmentRow = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes: string | null;
  bookedVia: string;
  cancelledAt: Date | null;
  cancelReason: string | null;
  cancelToken: string;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; name: string; phone: string; email: string | null };
  staff: { id: string; name: string };
  service: { id: string; name: string; duration: number; price: { toString(): string } };
};

export type AppointmentFilter = {
  status?: AppointmentStatus;
  staffId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export async function findAllAppointments(
  tenantId: string,
  filter: AppointmentFilter = {},
): Promise<AppointmentRow[]> {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      ...(filter.status && { status: filter.status }),
      ...(filter.staffId && { staffId: filter.staffId }),
      ...((filter.dateFrom || filter.dateTo) && {
        startTime: {
          ...(filter.dateFrom && { gte: filter.dateFrom }),
          ...(filter.dateTo   && { lte: filter.dateTo }),
        },
      }),
    },
    select: APPT_SELECT,
    orderBy: { startTime: 'desc' },
    take: 200,
  });
}

export async function findAppointmentById(
  tenantId: string,
  id: string,
): Promise<AppointmentRow | null> {
  return prisma.appointment.findFirst({
    where: { id, tenantId },
    select: APPT_SELECT,
  });
}

export async function cancelAppointment(
  tenantId: string,
  id: string,
  reason?: string,
): Promise<AppointmentRow | null> {
  const existing = await findAppointmentById(tenantId, id);
  if (!existing) return null;

  return prisma.appointment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
    },
    select: APPT_SELECT,
  });
}

export async function updateAppointmentStatus(
  tenantId: string,
  id: string,
  status: AppointmentStatus,
): Promise<AppointmentRow | null> {
  const existing = await findAppointmentById(tenantId, id);
  if (!existing) return null;
  return prisma.appointment.update({ where: { id }, data: { status }, select: APPT_SELECT });
}
