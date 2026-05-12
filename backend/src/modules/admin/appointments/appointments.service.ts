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
import {
  findTenantById,
  rescheduleAppointment,
} from '../../public/public.repository';
import { getAvailability } from '../../public/public.service';
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

export const AdminRescheduleSchema = z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time:    z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM'),
  staffId: z.string().min(1),
});

export async function getAvailableSlots(tenantId: string, id: string, date: string, staffId?: string) {
  const appt = await findAppointmentById(tenantId, id);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);

  const tenant = await findTenantById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404, ErrorCode.TENANT_NOT_FOUND);

  const slots = await getAvailability(tenant.slug, {
    serviceId: appt.service.id,
    date,
    staffId: staffId ?? appt.staff.id,
  });
  return { slots, serviceId: appt.service.id, currentStaffId: appt.staff.id };
}

export async function rescheduleAppt(tenantId: string, id: string, input: z.infer<typeof AdminRescheduleSchema>) {
  const appt = await findAppointmentById(tenantId, id);
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);
  if (appt.status === 'CANCELLED')  throw new AppError('Cannot reschedule a cancelled appointment', 400, ErrorCode.VALIDATION_ERROR);
  if (appt.status === 'COMPLETED')  throw new AppError('Cannot reschedule a completed appointment', 400, ErrorCode.VALIDATION_ERROR);

  const tenant = await findTenantById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404, ErrorCode.TENANT_NOT_FOUND);

  // Validate slot is available
  const available = await getAvailability(tenant.slug, {
    serviceId: appt.service.id,
    date:      input.date,
    staffId:   input.staffId,
  });
  if (!available.some((s) => s.time === input.time)) {
    throw new AppError('That time slot is no longer available', 409, ErrorCode.SLOT_TAKEN);
  }

  const startUTC = localToUTC(input.date, input.time, tenant.timezone);
  const endUTC   = new Date(startUTC.getTime() + appt.service.duration * 60 * 1000);

  const newAppt = await rescheduleAppointment(appt.id, {
    tenantId:   tenantId,
    customerId: appt.customer.id,
    staffId:    input.staffId,
    serviceId:  appt.service.id,
    startTime:  startUTC,
    endTime:    endUTC,
    notes:      appt.notes,
  });

  return {
    id:        newAppt.id,
    startTime: newAppt.startTime.toISOString(),
    endTime:   newAppt.endTime.toISOString(),
    status:    newAppt.status,
    cancelToken: newAppt.cancelToken,
    customer:  newAppt.customer,
    staff:     newAppt.staff,
    service:   appt.service,
  };
}

function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute]     = timeStr.split(':').map(Number);
  const local = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!));
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const parts   = formatter.formatToParts(local);
  const get     = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
  const offsetMs = local.getTime() - Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return new Date(local.getTime() + offsetMs);
}
