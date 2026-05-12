import { Request, Response, NextFunction } from 'express';
import { getVoiceConfig, saveVoiceConfig, UpdateVoiceConfigSchema } from './voice-config.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getVoiceConfig(req.tenantId);
    sendSuccess(res, config, 'Voice config retrieved');
  } catch (err) { next(err); }
}

export async function handleUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateVoiceConfigSchema.parse(req.body);
    const config = await saveVoiceConfig(req.tenantId, input);
    sendSuccess(res, config, 'Voice config saved');
  } catch (err) { next(err); }
}
