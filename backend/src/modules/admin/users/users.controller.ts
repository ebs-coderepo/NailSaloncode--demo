import { Request, Response, NextFunction } from 'express';
import {
  listUsers,
  getUser,
  createTeamMember,
  editTeamMember,
  adminResetPassword,
  changeOwnPassword,
  CreateUserSchema,
  UpdateUserSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from './users.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listUsers(req.tenantId);
    sendSuccess(res, result, `${result.count} team member${result.count !== 1 ? 's' : ''} retrieved`);
  } catch (err) { next(err); }
}

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getUser(req.tenantId, req.params['id']!);
    sendSuccess(res, user, 'Team member retrieved');
  } catch (err) { next(err); }
}

export async function handleCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateUserSchema.parse(req.body);
    const user = await createTeamMember(req.tenantId, input);
    sendSuccess(res, user, 'Team member account created', 201);
  } catch (err) { next(err); }
}

export async function handleUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateUserSchema.parse(req.body);
    const user = await editTeamMember(req.tenantId, req.params['id']!, input);
    sendSuccess(res, user, 'Team member updated');
  } catch (err) { next(err); }
}

export async function handleResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { newPassword } = ResetPasswordSchema.parse(req.body);
    await adminResetPassword(req.tenantId, req.params['id']!, newPassword);
    sendSuccess(res, null, 'Password reset successfully');
  } catch (err) { next(err); }
}

export async function handleChangePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    await changeOwnPassword(req.tenantId, req.userId!, currentPassword, newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) { next(err); }
}
