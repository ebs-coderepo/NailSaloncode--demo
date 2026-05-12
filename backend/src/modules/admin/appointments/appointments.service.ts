import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import {
  findAllAppointments,
  findAppointmentById,
  cancelAppointment,
  updateAppointmentStatus,
  AppointmentRow,
  AppointmentFilter,
} from './appointments.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

export const ListAppointmentsSchema = z.object({
  status:   z.nativeEnum(AppointmentStatus).optional(),
  staffId:  z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
});

export const CancelSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export type AppointmentDto = {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  bookedVia: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelToken: string;
  customer: { id: string; name: string; phone: string; email: string | null };
  staff: { id: string; name: string };
  service: { id: string; name: string; duration: number; price: string };
  createdAt: string;
};

function toDto(row: AppointmentRow): AppointmentDto {
  return {
    id: row.id,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
    notes: row.notes,
    bookedVia: row.bookedVia,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,
    cancelToken: row.cancelToken,
    customer: row.customer,
    staff: row.staff,
    service: {
      id: row.service.id,
      name: row.service.name,
      duration: row.service.duration,
      price: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        parseFloat(row.service.price.toString()),
      ),
    },
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAppointments(tenantId: string, query: z.infer<typeof ListAppointmentsSchema>) {
  const filter: AppointmentFilter = {
    status:   query.status,
    staffId:  query.staffId,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo:   query.dateTo   ? new Date(query.dateTo)   : undefined,
  };
  const rows = await findAllAppointments(tenantId, filter);
  return { appointments: rows.map(toDto), count: rows.length };
}

export async function getAppointment(tenantId: string, id: string) {
  const row = await findAppointmentById(tenantId, id);
  if (!row) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function cancelAppt(tenantId: string, id: string, reason?: string) {
  const row = await findAppointmentById(tenantId, id);
  if (!row) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  if (row.status === 'CANCELLED') throw new AppError('Appointment already cancelled', 400, ErrorCode.VALIDATION_ERROR);
  if (row.status === 'COMPLETED') throw new AppError('Cannot cancel a completed appointment', 400, ErrorCode.VALIDATION_ERROR);
  const updated = await cancelAppointment(tenantId, id, reason);
  return toDto(updated!);
}

export async function changeStatus(tenantId: string, id: string, status: AppointmentStatus) {
  const row = await updateAppointmentStatus(tenantId, id, status);
  if (!row) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}
