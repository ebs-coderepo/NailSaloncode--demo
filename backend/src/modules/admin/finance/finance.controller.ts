import { Request, Response, NextFunction } from 'express';
import { getFinanceSummary } from './finance.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getFinanceSummary(req.tenantId);
    sendSuccess(res, data, 'Finance summary retrieved');
  } catch (err) { next(err); }
}
