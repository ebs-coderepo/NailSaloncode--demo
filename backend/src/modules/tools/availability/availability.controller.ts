import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAvailability } from '../../public/public.service';
import { prisma } from '../../../shared/db/prismaClient';
import { sendSuccess } from '../../../shared/utils/apiResponse';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

const QuerySchema = z.object({
  serviceId: z.string().min(1),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  staffId:   z.string().optional(),
});

export async function handleAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const query = QuerySchema.parse(req.query);

    // Resolve tenant slug from tenantId (set by toolAuth)
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { slug: true, bookingEnabled: true },
    });
    if (!tenant) throw new AppError('Tenant not found', 404, ErrorCode.TENANT_NOT_FOUND);
    if (!tenant.bookingEnabled) {
      return sendSuccess(res, { slots: [], count: 0 }, 'Online booking is not enabled');
    }

    const slots = await getAvailability(tenant.slug, query);
    sendSuccess(res, { slots, count: slots.length }, slots.length === 0 ? 'No available slots' : `${slots.length} slot(s) available`);
  } catch (err) { next(err); }
}
