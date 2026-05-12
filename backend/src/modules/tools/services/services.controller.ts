import { Request, Response, NextFunction } from 'express';
import { getActiveServices } from './services.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

// ─────────────────────────────────────────────────────────────────────────────
// Services Controller
//
// Responsibility: handle the HTTP layer only.
//  - Read validated inputs from req
//  - Call the service layer
//  - Send the response
//
// No DB calls. No business logic. No Prisma here.
// tenantId comes from req.tenantId — set by toolAuthMiddleware, never from body.
// ─────────────────────────────────────────────────────────────────────────────

export async function listServices(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // tenantId is guaranteed to be present — toolAuthMiddleware runs first
    const result = await getActiveServices(req.tenantId);

    sendSuccess(
      res,
      result,
      result.count === 0
        ? 'No active services found'
        : `${result.count} service${result.count === 1 ? '' : 's'} retrieved`,
    );
  } catch (err) {
    // Pass to global errorHandler — never swallow errors in controllers
    next(err);
  }
}
