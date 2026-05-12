import { prisma } from '../../../shared/db/prismaClient';
import { RequestType, RequestStatus } from '@prisma/client';

const REQUEST_SELECT = {
  id: true,
  appointmentId: true,
  type: true,
  status: true,
  reason: true,
  proposedDate: true,
  proposedTime: true,
  proposedStaffId: true,
  reviewNote: true,
  createdAt: true,
  requestedBy: { select: { id: true, name: true, role: true } },
  appointment: {
    select: {
      id: true, startTime: true, endTime: true, status: true, cancelToken: true,
      customer: { select: { name: true, phone: true } },
      staff:    { select: { id: true, name: true } },
      service:  { select: { name: true, price: true, duration: true } },
    },
  },
} as const;

export type RequestRow = {
  id: string;
  appointmentId: string;
  type: RequestType;
  status: RequestStatus;
  reason: string | null;
  proposedDate: string | null;
  proposedTime: string | null;
  proposedStaffId: string | null;
  reviewNote: string | null;
  createdAt: Date;
  requestedBy: { id: string; name: string; role: string };
  appointment: {
    id: string; startTime: Date; endTime: Date; status: string; cancelToken: string;
    customer: { name: string; phone: string };
    staff:    { id: string; name: string };
    service:  { name: string; price: any; duration: number };
  };
};

export async function findAllRequests(tenantId: string, status?: RequestStatus): Promise<RequestRow[]> {
  return prisma.appointmentRequest.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    select: REQUEST_SELECT,
    orderBy: { createdAt: 'desc' },
  }) as any;
}

export async function findRequestById(tenantId: string, id: string): Promise<RequestRow | null> {
  return prisma.appointmentRequest.findFirst({
    where: { id, tenantId },
    select: REQUEST_SELECT,
  }) as any;
}

export async function createRequest(
  tenantId: string,
  input: {
    appointmentId: string;
    requestedById: string;
    type: RequestType;
    reason?: string | null;
    proposedDate?: string | null;
    proposedTime?: string | null;
    proposedStaffId?: string | null;
  },
): Promise<RequestRow> {
  return prisma.appointmentRequest.create({
    data: { tenantId, ...input },
    select: REQUEST_SELECT,
  }) as any;
}

export async function updateRequestStatus(
  tenantId: string,
  id: string,
  status: RequestStatus,
  reviewedById: string,
  reviewNote?: string | null,
): Promise<RequestRow | null> {
  return prisma.appointmentRequest.update({
    where: { id, tenantId },
    data: { status, reviewedById, reviewNote: reviewNote ?? null },
    select: REQUEST_SELECT,
  }).catch(() => null) as any;
}

export async function countPendingRequests(tenantId: string): Promise<number> {
  return prisma.appointmentRequest.count({ where: { tenantId, status: 'PENDING' } });
}
