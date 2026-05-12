import { Request, Response, NextFunction } from 'express';
import {
  getCalendarData,
  addBlock,
  removeBlock,
  addOverride,
  removeOverride,
  CreateBlockSchema,
  CreateOverrideSchema,
} from './calendar.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleGetCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const year  = parseInt(req.query['year']  as string) || new Date().getFullYear();
    const month = parseInt(req.query['month'] as string) || new Date().getMonth() + 1;
    // STAFF can only see their own calendar; OWNER/MANAGER can filter by any staffId
    const staffId =
      req.userRole === 'STAFF'
        ? req.staffId                                    // locked to their own
        : (req.query['staffId'] as string) || undefined; // optional filter

    const data = await getCalendarData(req.tenantId, year, month, staffId);
    sendSuccess(res, data, 'Calendar data retrieved');
  } catch (err) { next(err); }
}

export async function handleCreateBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateBlockSchema.parse(req.body);
    const block = await addBlock(req.tenantId, req.userRole!, req.staffId, input);
    sendSuccess(res, block, 'Block added', 201);
  } catch (err) { next(err); }
}

export async function handleDeleteBlock(req: Request, res: Response, next: NextFunction) {
  try {
    await removeBlock(req.tenantId, req.params['id']!);
    sendSuccess(res, null, 'Block removed');
  } catch (err) { next(err); }
}

export async function handleCreateOverride(req: Request, res: Response, next: NextFunction) {
  try {
    const input    = CreateOverrideSchema.parse(req.body);
    const override = await addOverride(req.tenantId, req.userRole!, req.staffId, input);
    sendSuccess(res, override, 'Override saved', 201);
  } catch (err) { next(err); }
}

export async function handleDeleteOverride(req: Request, res: Response, next: NextFunction) {
  try {
    await removeOverride(req.tenantId, req.params['id']!);
    sendSuccess(res, null, 'Override removed');
  } catch (err) { next(err); }
}
