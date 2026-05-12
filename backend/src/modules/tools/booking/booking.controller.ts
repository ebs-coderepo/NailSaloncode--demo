import { Request, Response, NextFunction } from 'express';
import { createBooking, BookingSchema } from '../../public/public.service';
import { prisma } from '../../../shared/db/prismaClient';
import { sendSuccess } from '../../../shared/utils/apiResponse';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

export async function handleBook(req: Request, res: Response, next: NextFunction) {
  try {
    const input = BookingSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { slug: true },
    });
    if (!tenant) throw new AppError('Tenant not found', 404, ErrorCode.TENANT_NOT_FOUND);

    const booking = await createBooking(tenant.slug, input);
    sendSuccess(res, booking, 'Appointment booked successfully', 201);
  } catch (err) { next(err); }
}
