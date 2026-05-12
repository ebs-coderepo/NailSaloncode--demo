import { Request, Response, NextFunction } from 'express';
import {
  listStaff,
  getStaff,
  addStaff,
  editStaff,
  getMyProfile,
  updateMyProfile,
  CreateStaffSchema,
  UpdateStaffSchema,
} from './staff.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';
import { AppError } from '../../../shared/utils/AppError';
import { ErrorCode } from '../../../shared/types/api.types';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listStaff(req.tenantId);
    sendSuccess(res, result, `${result.count} staff member${result.count !== 1 ? 's' : ''} retrieved`);
  } catch (err) { next(err); }
}

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await getStaff(req.tenantId, req.params['id']!);
    sendSuccess(res, member, 'Staff member retrieved');
  } catch (err) { next(err); }
}

export async function handleCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateStaffSchema.parse(req.body);
    const member = await addStaff(req.tenantId, input);
    sendSuccess(res, member, 'Staff member added', 201);
  } catch (err) { next(err); }
}

export async function handleUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateStaffSchema.parse(req.body);
    const member = await editStaff(req.tenantId, req.params['id']!, input);
    sendSuccess(res, member, 'Staff member updated');
  } catch (err) { next(err); }
}

export async function handleDeactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const member = await editStaff(req.tenantId, req.params['id']!, { isActive: false });
    sendSuccess(res, member, 'Staff member deactivated');
  } catch (err) { next(err); }
}

export async function handleGetMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.staffId) throw new AppError('No staff profile linked to this account', 404, ErrorCode.NOT_FOUND);
    const profile = await getMyProfile(req.tenantId, req.staffId);
    sendSuccess(res, profile, 'Profile retrieved');
  } catch (err) { next(err); }
}

export async function handleUpdateMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.staffId) throw new AppError('No staff profile linked to this account', 404, ErrorCode.NOT_FOUND);
    const input = UpdateStaffSchema.parse(req.body);
    const profile = await updateMyProfile(req.tenantId, req.staffId, input);
    sendSuccess(res, profile, 'Profile updated');
  } catch (err) { next(err); }
}
