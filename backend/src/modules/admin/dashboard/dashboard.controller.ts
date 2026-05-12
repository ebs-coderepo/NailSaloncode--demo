import { Request, Response, NextFunction } from 'express';
import { getDashboardStats } from './dashboard.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function dashboardStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await getDashboardStats(req.tenantId);
    sendSuccess(res, stats, 'Dashboard stats retrieved');
  } catch (err) {
    next(err);
  }
}
