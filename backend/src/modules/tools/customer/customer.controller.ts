import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../../shared/db/prismaClient';
import { sendSuccess } from '../../../shared/utils/apiResponse';

const LookupSchema = z.object({
  phone: z.string().min(7),
});

export async function handleLookup(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = LookupSchema.parse(req.query);

    const customer = await prisma.customer.findFirst({
      where: { tenantId: req.tenantId, phone },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        notes: true,
        appointments: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          orderBy: { startTime: 'asc' },
          take: 3,
          select: {
            id: true,
            startTime: true,
            status: true,
            service: { select: { name: true } },
            staff:   { select: { name: true } },
          },
        },
      },
    });

    if (!customer) {
      return sendSuccess(res, { found: false, customer: null }, 'Customer not found');
    }

    sendSuccess(res, {
      found: true,
      customer: {
        id:    customer.id,
        name:  customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        upcomingAppointments: customer.appointments.map((a) => ({
          id:        a.id,
          startTime: a.startTime.toISOString(),
          status:    a.status,
          service:   a.service.name,
          staff:     a.staff.name,
        })),
      },
    }, 'Customer found');
  } catch (err) { next(err); }
}
