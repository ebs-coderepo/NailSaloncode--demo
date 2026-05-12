import { prisma } from '../../../shared/db/prismaClient';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export type PaymentRow = {
  id: string;
  tenantId: string;
  appointmentId: string;
  amount: any;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  gatewayPaymentId: string | null;
  notes: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  appointment: {
    startTime: Date;
    customer: { name: string; phone: string };
    staff:    { name: string };
    service:  { name: string };
  };
};

const PAYMENT_SELECT = {
  id: true,
  tenantId: true,
  appointmentId: true,
  amount: true,
  currency: true,
  status: true,
  method: true,
  gatewayPaymentId: true,
  notes: true,
  paidAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      startTime: true,
      customer: { select: { name: true, phone: true } },
      staff:    { select: { name: true } },
      service:  { select: { name: true } },
    },
  },
} as const;

export async function findAllPayments(tenantId: string, filter?: { status?: PaymentStatus; from?: Date; to?: Date }): Promise<PaymentRow[]> {
  return prisma.payment.findMany({
    where: {
      tenantId,
      ...(filter?.status && { status: filter.status }),
      ...(filter?.from || filter?.to ? {
        createdAt: {
          ...(filter.from && { gte: filter.from }),
          ...(filter.to   && { lte: filter.to }),
        },
      } : {}),
    },
    select: PAYMENT_SELECT,
    orderBy: { createdAt: 'desc' },
  }) as any;
}

export async function findPaymentByAppointment(tenantId: string, appointmentId: string): Promise<PaymentRow | null> {
  return prisma.payment.findFirst({ where: { tenantId, appointmentId }, select: PAYMENT_SELECT }) as any;
}

export type CreatePaymentInput = {
  appointmentId: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  notes?: string | null;
  gatewayPaymentId?: string | null;
};

export async function createPayment(tenantId: string, input: CreatePaymentInput): Promise<PaymentRow> {
  return prisma.payment.create({
    data: {
      tenantId,
      appointmentId: input.appointmentId,
      amount:        input.amount,
      currency:      input.currency ?? 'USD',
      method:        input.method,
      notes:         input.notes ?? null,
      gatewayPaymentId: input.gatewayPaymentId ?? null,
      status:        PaymentStatus.COMPLETED,
      paidAt:        new Date(),
    },
    select: PAYMENT_SELECT,
  }) as any;
}

export async function updatePaymentStatus(tenantId: string, id: string, status: PaymentStatus): Promise<PaymentRow | null> {
  return prisma.payment.update({
    where: { id, tenantId },
    data: {
      status,
      ...(status === PaymentStatus.REFUNDED && { refundedAt: new Date() }),
    },
    select: PAYMENT_SELECT,
  }).catch(() => null) as any;
}

// Payment config
export async function findPaymentConfig(tenantId: string) {
  return prisma.paymentConfig.findUnique({ where: { tenantId } });
}

export async function upsertPaymentConfig(tenantId: string, input: Partial<{
  isEnabled: boolean;
  currency: string;
  acceptCash: boolean;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  squareAccessToken: string | null;
  squareLocationId: string | null;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
}>) {
  return prisma.paymentConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...input },
    update: input,
  });
}
