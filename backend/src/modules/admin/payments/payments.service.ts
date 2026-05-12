import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  findAllPayments,
  findPaymentByAppointment,
  createPayment,
  updatePaymentStatus,
  findPaymentConfig,
  upsertPaymentConfig,
  PaymentRow,
} from './payments.repository';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';
import { prisma } from '../../../shared/db/prismaClient';

// ── Schemas ────────────────────────────────────────────────────────────────────

export const ListPaymentsSchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  from:   z.string().optional(),
  to:     z.string().optional(),
});

export const RecordPaymentSchema = z.object({
  appointmentId:   z.string().min(1),
  amount:          z.number().positive(),
  method:          z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes:           z.string().max(300).nullable().optional(),
  gatewayPaymentId: z.string().nullable().optional(),
});

export const UpdatePaymentConfigSchema = z.object({
  isEnabled:           z.boolean().optional(),
  currency:            z.string().max(3).optional(),
  acceptCash:          z.boolean().optional(),
  stripePublishableKey: z.string().nullable().optional(),
  stripeSecretKey:      z.string().nullable().optional(),
  stripeWebhookSecret:  z.string().nullable().optional(),
  squareAccessToken:    z.string().nullable().optional(),
  squareLocationId:     z.string().nullable().optional(),
  paypalClientId:       z.string().nullable().optional(),
  paypalClientSecret:   z.string().nullable().optional(),
});

// ── DTOs ───────────────────────────────────────────────────────────────────────

export type PaymentDto = {
  id: string;
  appointmentId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  gatewayPaymentId: string | null;
  notes: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  appointment: {
    startTime: string;
    customer: { name: string; phone: string };
    staff:    { name: string };
    service:  { name: string };
  };
};

function toDto(row: PaymentRow): PaymentDto {
  return {
    id:              row.id,
    appointmentId:   row.appointmentId,
    amount:          formatCurrency(parseFloat(row.amount.toString()), row.currency),
    currency:        row.currency,
    status:          row.status,
    method:          row.method,
    gatewayPaymentId: row.gatewayPaymentId,
    notes:           row.notes,
    paidAt:          row.paidAt?.toISOString() ?? null,
    refundedAt:      row.refundedAt?.toISOString() ?? null,
    createdAt:       row.createdAt.toISOString(),
    appointment: {
      startTime: row.appointment.startTime.toISOString(),
      customer:  row.appointment.customer,
      staff:     row.appointment.staff,
      service:   row.appointment.service,
    },
  };
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// ── Service functions ──────────────────────────────────────────────────────────

export async function listPayments(tenantId: string, query: z.infer<typeof ListPaymentsSchema>) {
  const rows = await findAllPayments(tenantId, {
    status: query.status,
    from:   query.from ? new Date(query.from) : undefined,
    to:     query.to   ? new Date(query.to)   : undefined,
  });
  return { payments: rows.map(toDto), count: rows.length };
}

export async function recordPayment(tenantId: string, input: z.infer<typeof RecordPaymentSchema>) {
  // Verify appointment exists and belongs to this tenant
  const appt = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, tenantId },
    select: { id: true, status: true },
  });
  if (!appt) throw new AppError('Appointment not found', 404, ErrorCode.NOT_FOUND);

  // Check for existing payment
  const existing = await findPaymentByAppointment(tenantId, input.appointmentId);
  if (existing && existing.status === PaymentStatus.COMPLETED) {
    throw new AppError('A completed payment already exists for this appointment', 409, ErrorCode.VALIDATION_ERROR);
  }

  const row = await createPayment(tenantId, {
    appointmentId:    input.appointmentId,
    amount:           input.amount,
    method:           input.method,
    notes:            input.notes,
    gatewayPaymentId: input.gatewayPaymentId,
  });

  // Auto-mark appointment as COMPLETED when payment is recorded
  await prisma.appointment.update({
    where: { id: input.appointmentId },
    data: { status: 'COMPLETED' },
  });

  return toDto(row);
}

export async function refundPayment(tenantId: string, paymentId: string) {
  const row = await updatePaymentStatus(tenantId, paymentId, PaymentStatus.REFUNDED);
  if (!row) throw new AppError('Payment not found', 404, ErrorCode.NOT_FOUND);
  return toDto(row);
}

export async function getPaymentConfig(tenantId: string) {
  const config = await findPaymentConfig(tenantId);
  if (!config) {
    return {
      isEnabled: false, currency: 'USD', acceptCash: true,
      stripePublishableKey: null, stripeConfigured: false,
      squareConfigured: false, paypalConfigured: false,
    };
  }
  return {
    isEnabled:            config.isEnabled,
    currency:             config.currency,
    acceptCash:           config.acceptCash,
    stripePublishableKey: config.stripePublishableKey,
    stripeConfigured:     !!config.stripeSecretKey,
    squareConfigured:     !!config.squareAccessToken,
    paypalConfigured:     !!config.paypalClientId,
  };
}

export async function savePaymentConfig(tenantId: string, input: z.infer<typeof UpdatePaymentConfigSchema>) {
  await upsertPaymentConfig(tenantId, input as any);
  return getPaymentConfig(tenantId);
}
