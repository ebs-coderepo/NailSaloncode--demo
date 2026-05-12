import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../shared/db/prismaClient';
import { env } from '../../config/env';
import { createPayment, findPaymentByAppointment } from '../admin/payments/payments.repository';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

const STRIPE_API_VERSION = '2026-04-22.dahlia' as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function findAppointmentByToken(cancelToken: string) {
  return prisma.appointment.findUnique({
    where: { cancelToken },
    select: {
      id: true,
      tenantId: true,
      startTime: true,
      status: true,
      cancelToken: true,
      service: { select: { name: true, price: true } },
      customer: { select: { name: true, phone: true, email: true } },
      staff:    { select: { name: true } },
      tenant:   { select: { name: true } },
      payment:  { select: { status: true, paidAt: true, amount: true, method: true } },
    },
  });
}

// ── GET /pay/:token — payment info ─────────────────────────────────────────────

export async function handleGetPaymentInfo(req: Request, res: Response): Promise<void> {
  const appt = await findAppointmentByToken(req.params.token);
  if (!appt) { res.status(404).json({ success: false, message: 'Payment link not found' }); return; }

  const payConfig = await prisma.paymentConfig.findUnique({
    where: { tenantId: appt.tenantId },
    select: { isEnabled: true, stripeSecretKey: true, stripePublishableKey: true, currency: true },
  });

  const isPaid = appt.payment?.status === PaymentStatus.COMPLETED;
  const amount = parseFloat(appt.service.price.toString());

  res.json({
    success: true,
    data: {
      salonName:           appt.tenant.name,
      customerName:        appt.customer.name,
      serviceName:         appt.service.name,
      staffName:           appt.staff.name,
      startTime:           appt.startTime.toISOString(),
      amount,
      currency:            payConfig?.currency ?? 'USD',
      isPaid,
      appointmentStatus:   appt.status,
      stripeEnabled:       !!(payConfig?.isEnabled && payConfig.stripeSecretKey),
      stripePublishableKey: payConfig?.stripePublishableKey ?? null,
      payment: appt.payment ? {
        paidAt: appt.payment.paidAt?.toISOString() ?? null,
        amount: parseFloat((appt.payment.amount as any).toString()),
        method: appt.payment.method,
      } : null,
    },
  });
}

// ── POST /pay/:token/checkout — create Stripe Checkout Session ─────────────────

export async function handleCreateCheckout(req: Request, res: Response): Promise<void> {
  const appt = await findAppointmentByToken(req.params.token);
  if (!appt) { res.status(404).json({ success: false, message: 'Payment link not found' }); return; }

  if (appt.payment?.status === PaymentStatus.COMPLETED) {
    res.status(409).json({ success: false, message: 'This appointment has already been paid' });
    return;
  }

  const payConfig = await prisma.paymentConfig.findUnique({
    where: { tenantId: appt.tenantId },
    select: { isEnabled: true, stripeSecretKey: true, currency: true },
  });

  if (!payConfig?.isEnabled || !payConfig.stripeSecretKey) {
    res.status(400).json({ success: false, message: 'Online payments are not enabled for this salon' });
    return;
  }

  const stripe = new Stripe(payConfig.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
  const amount = parseFloat(appt.service.price.toString());
  const currency = (payConfig.currency ?? 'USD').toLowerCase();

  const baseUrl = env.FRONTEND_URL;
  const token   = appt.cancelToken;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: appt.customer.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: appt.service.name,
            description: `Appointment at ${appt.tenant.name} with ${appt.staff.name}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/pay/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${baseUrl}/pay/${token}`,
    metadata: {
      tenantId:      appt.tenantId,
      appointmentId: appt.id,
      cancelToken:   token,
    },
  });

  res.json({ success: true, data: { url: session.url } });
}

// ── POST /pay/:token/verify — verify Stripe session and record payment ─────────

export async function handleVerifyPayment(req: Request, res: Response): Promise<void> {
  const { session_id } = req.body as { session_id?: string };
  if (!session_id) {
    res.status(400).json({ success: false, message: 'session_id is required' });
    return;
  }

  const appt = await findAppointmentByToken(req.params.token);
  if (!appt) { res.status(404).json({ success: false, message: 'Payment link not found' }); return; }

  // Idempotent: if already recorded, just return success
  const existing = await findPaymentByAppointment(appt.tenantId, appt.id);
  if (existing?.status === PaymentStatus.COMPLETED) {
    res.json({ success: true, data: { alreadyPaid: true } });
    return;
  }

  const payConfig = await prisma.paymentConfig.findUnique({
    where: { tenantId: appt.tenantId },
    select: { stripeSecretKey: true },
  });

  if (!payConfig?.stripeSecretKey) {
    res.status(400).json({ success: false, message: 'Stripe not configured' });
    return;
  }

  const stripe = new Stripe(payConfig.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== 'paid') {
    res.status(402).json({ success: false, message: 'Payment not completed' });
    return;
  }

  if (session.metadata?.appointmentId !== appt.id) {
    res.status(400).json({ success: false, message: 'Session mismatch' });
    return;
  }

  const amount = session.amount_total ? session.amount_total / 100 : parseFloat(appt.service.price.toString());

  await createPayment(appt.tenantId, {
    appointmentId:    appt.id,
    amount,
    method:           PaymentMethod.STRIPE,
    gatewayPaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    notes:            `Stripe Checkout session: ${session_id}`,
  });

  await prisma.appointment.update({
    where: { id: appt.id },
    data:  { status: 'COMPLETED' },
  });

  res.json({ success: true, data: { alreadyPaid: false } });
}
