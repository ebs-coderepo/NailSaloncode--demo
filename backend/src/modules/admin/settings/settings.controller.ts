import { Request, Response, NextFunction } from 'express';
import { getSettings, saveSettings, UpdateSettingsSchema } from './settings.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getSettings(req.tenantId);
    sendSuccess(res, settings, 'Settings retrieved');
  } catch (err) { next(err); }
}

export async function handleUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateSettingsSchema.parse(req.body);
    const settings = await saveSettings(req.tenantId, input);
    sendSuccess(res, settings, 'Settings saved');
  } catch (err) { next(err); }
}
