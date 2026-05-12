import { z } from 'zod';
import {
  getMonthAppointments,
  getMonthBlockedTimes,
  getMonthOverrides,
  createBlock,
  deleteBlock,
  createOverride,
  deleteOverride,
  getActiveStaff,
} from './calendar.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

export const CreateBlockSchema = z.object({
  staffId:   z.string().cuid(),
  startTime: z.string().datetime(),
  endTime:   z.string().datetime(),
  reason:    z.string().max(200).optional(),
});

export const CreateOverrideSchema = z.object({
  staffId:   z.string().cuid(),
  date:      z.string().date(),        // "YYYY-MM-DD"
  isWorking: z.boolean().default(false),
  note:      z.string().max(200).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "HH:MM"
  endTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type CreateBlockDto    = z.infer<typeof CreateBlockSchema>;
export type CreateOverrideDto = z.infer<typeof CreateOverrideSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Month range helper
// ─────────────────────────────────────────────────────────────────────────────

function monthRange(year: number, month: number) {
  // month is 1-indexed (1 = January)
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end   = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar data for a given month
// ─────────────────────────────────────────────────────────────────────────────

export async function getCalendarData(
  tenantId: string,
  year: number,
  month: number,
  staffId?: string,
) {
  const { start, end } = monthRange(year, month);

  const [appointments, blockedTimes, overrides, staffList] = await Promise.all([
    getMonthAppointments(tenantId, start, end, staffId),
    getMonthBlockedTimes(tenantId, start, end, staffId),
    getMonthOverrides(tenantId, start, end, staffId),
    getActiveStaff(tenantId),
  ]);

  return {
    year,
    month,
    staffId: staffId ?? null,
    appointments: appointments.map((a) => ({
      id:         a.id,
      startTime:  a.startTime.toISOString(),
      endTime:    a.endTime.toISOString(),
      status:     a.status,
      bookedVia:  a.bookedVia,
      customer:   a.customer.name,
      phone:      a.customer.phone,
      service:    a.service.name,
      duration:   a.service.duration,
      staff:      a.staff.name,
      staffId:    a.staff.id,
    })),
    blockedTimes: blockedTimes.map((b) => ({
      id:        b.id,
      startTime: b.startTime.toISOString(),
      endTime:   b.endTime.toISOString(),
      reason:    b.reason,
      staff:     b.staff.name,
      staffId:   b.staff.id,
    })),
    overrides: overrides.map((o) => ({
      id:        o.id,
      date:      o.date.toISOString().split('T')[0],
      isWorking: o.isWorking,
      startTime: o.startTime,
      endTime:   o.endTime,
      note:      o.note,
      staff:     o.staff.name,
      staffId:   o.staff.id,
    })),
    staffList,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations — STAFF can only act on their own staffId
// ─────────────────────────────────────────────────────────────────────────────

function assertStaffAccess(
  requestingRole: string,
  requestingStaffId: string | undefined,
  targetStaffId: string,
) {
  if (requestingRole === 'STAFF' && requestingStaffId !== targetStaffId) {
    throw new AppError(
      'You can only manage your own schedule',
      403,
      ErrorCode.FORBIDDEN,
    );
  }
}

export async function addBlock(
  tenantId: string,
  requesterRole: string,
  requesterStaffId: string | undefined,
  input: CreateBlockDto,
) {
  assertStaffAccess(requesterRole, requesterStaffId, input.staffId);

  const start = new Date(input.startTime);
  const end   = new Date(input.endTime);

  if (end <= start) {
    throw new AppError('End time must be after start time', 400, ErrorCode.VALIDATION_ERROR);
  }

  return createBlock(tenantId, input.staffId, start, end, input.reason);
}

export async function removeBlock(
  tenantId: string,
  id: string,
) {
  const deleted = await deleteBlock(tenantId, id);
  if (!deleted) throw new AppError('Block not found', 404, ErrorCode.INTERNAL_ERROR);
}

export async function addOverride(
  tenantId: string,
  requesterRole: string,
  requesterStaffId: string | undefined,
  input: CreateOverrideDto,
) {
  assertStaffAccess(requesterRole, requesterStaffId, input.staffId);

  const date = new Date(input.date + 'T00:00:00.000Z');

  return createOverride(
    tenantId,
    input.staffId,
    date,
    input.isWorking,
    input.note,
    input.startTime,
    input.endTime,
  );
}

export async function removeOverride(tenantId: string, id: string) {
  const deleted = await deleteOverride(tenantId, id);
  if (!deleted) throw new AppError('Override not found', 404, ErrorCode.INTERNAL_ERROR);
}
