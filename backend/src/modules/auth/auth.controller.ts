import { Request, Response, NextFunction } from 'express';
import { loginUser, LoginSchema } from './auth.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await loginUser(input);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}
