import { z } from 'zod';
import { RequestType, RequestStatus } from '@prisma/client';
import {
  findAllRequests, findRequestById, createRequest,
  updateRequestStatus, countPendingRequests, RequestRow,
} from './requests.repository';
import { rescheduleAppt, cancelAppt, changeStatus } from '../appointments/appointments.service';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

// ── Schemas ────────────────────────────────────────────────────────────────────

export const SubmitRequestSchema = z.object({
  type:   z.nativeEnum(RequestType),
  reason: z.string().max(400).nullable().optional(),
  // Reschedule fields — required when type === RESCHEDULE
  proposedDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  proposedTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  proposedStaffId: z.string().optional(),
}).refine(
  (d) => d.type !== 'RESCHEDULE' || (d.proposedDate && d.proposedTime && d.proposedStaffId),
  { message: 'Reschedule requests require proposedDate, proposedTime, and proposedStaffId' },
);

export const ReviewRequestSchema = z.object({
  reviewNote: z.string().max(400).nullable().optional(),
});

// ── DTOs ───────────────────────────────────────────────────────────────────────

export type RequestDto = {
  id: string;
  appointmentId: string;
  type: RequestType;
  status: RequestStatus;
  reason: string | null;
  proposedDate: string | null;
  proposedTime: string | null;
  proposedStaffId: string | null;
  reviewNote: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; role: string };
  appointment: {
    id: string; startTime: string; status: string; cancelToken: string;
    customer: { name: string; phone: string };
    staff:    { id: string; name: string };
    service:  { name: string; duration: number; price: string };
  };
};

function toDto(row: RequestRow): RequestDto {
  return {
    id:              row.id,
    appointmentId:   row.appointmentId,
    type:            row.type,
    status:          row.status,
    reason:          row.reason,
    proposedDate:    row.proposedDate,
    proposedTime:    row.proposedTime,
    proposedStaffId: row.proposedStaffId,
    reviewNote:      row.reviewNote,
    createdAt:       row.createdAt.toISOString(),
    requestedBy:     row.requestedBy,
    appointment: {
      id:          row.appointment.id,
      startTime:   row.appointment.startTime.toISOString(),
      status:      row.appointment.status,
      cancelToken: row.appointment.cancelToken,
      customer:    row.appointment.customer,
      staff:       row.appointment.staff,
      service: {
        name:     row.appointment.service.name,
        duration: row.appointment.service.duration,
        price:    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                    .format(parseFloat(row.appointment.service.price.toString())),
      },
    },
  };
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listRequests(tenantId: string, status?: RequestStatus) {
  const rows = await findAllRequests(tenantId, status);
  return { requests: rows.map(toDto), count: rows.length };
}

export async function submitRequest(
  tenantId: string,
  appointmentId: string,
  requestedById: string,
  input: z.infer<typeof SubmitRequestSchema>,
) {
  // Prevent duplicate pending requests for the same appointment + type
  const existing = await findAllRequests(tenantId, RequestStatus.PENDING);
  const dup = existing.find(
    (r) => r.appointmentId === appointmentId && r.type === input.type,
  );
  if (dup) throw new AppError('A pending request of this type already exists for this appointment', 409, ErrorCode.VALIDATION_ERROR);

  const row = await createRequest(tenantId, {
    appointmentId,
    requestedById,
    type:            input.type,
    reason:          input.reason,
    proposedDate:    input.proposedDate,
    proposedTime:    input.proposedTime,
    proposedStaffId: input.proposedStaffId,
  });
  return toDto(row);
}

export async function approveRequest(
  tenantId: string,
  requestId: string,
  reviewerId: string,
  reviewNote?: string | null,
) {
  const row = await findRequestById(tenantId, requestId);
  if (!row)                             throw new AppError('Request not found', 404, ErrorCode.NOT_FOUND);
  if (row.status !== RequestStatus.PENDING) throw new AppError('Request is no longer pending', 400, ErrorCode.VALIDATION_ERROR);

  // Execute the underlying action
  if (row.type === RequestType.CANCEL) {
    await cancelAppt(tenantId, row.appointmentId, row.reason ?? 'Cancelled via staff request');
  } else if (row.type === RequestType.COMPLETE) {
    await changeStatus(tenantId, row.appointmentId, 'COMPLETED');
  } else if (row.type === RequestType.RESCHEDULE) {
    if (!row.proposedDate || !row.proposedTime || !row.proposedStaffId) {
      throw new AppError('Reschedule request is missing proposed time details', 400, ErrorCode.VALIDATION_ERROR);
    }
    await rescheduleAppt(tenantId, row.appointmentId, {
      date:    row.proposedDate,
      time:    row.proposedTime,
      staffId: row.proposedStaffId,
    });
  }

  const updated = await updateRequestStatus(tenantId, requestId, RequestStatus.APPROVED, reviewerId, reviewNote);
  return toDto(updated!);
}

export async function rejectRequest(
  tenantId: string,
  requestId: string,
  reviewerId: string,
  reviewNote?: string | null,
) {
  const row = await findRequestById(tenantId, requestId);
  if (!row)                             throw new AppError('Request not found', 404, ErrorCode.NOT_FOUND);
  if (row.status !== RequestStatus.PENDING) throw new AppError('Request is no longer pending', 400, ErrorCode.VALIDATION_ERROR);

  const updated = await updateRequestStatus(tenantId, requestId, RequestStatus.REJECTED, reviewerId, reviewNote);
  return toDto(updated!);
}

export async function getPendingCount(tenantId: string) {
  return countPendingRequests(tenantId);
}
