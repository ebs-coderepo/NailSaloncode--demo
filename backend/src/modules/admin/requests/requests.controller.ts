import { Request, Response, NextFunction } from 'express';
import { RequestStatus } from '@prisma/client';
import {
  listRequests, submitRequest, approveRequest, rejectRequest,
  SubmitRequestSchema, ReviewRequestSchema,
} from './requests.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query['status'] as RequestStatus | undefined;
    const result = await listRequests(req.tenantId, status);
    sendSuccess(res, result, `${result.count} request(s) found`);
  } catch (err) { next(err); }
}

export async function handleSubmit(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitRequestSchema.parse(req.body);
    const result = await submitRequest(req.tenantId, req.params['appointmentId']!, req.userId!, input);
    sendSuccess(res, result, 'Request submitted', 201);
  } catch (err) { next(err); }
}

export async function handleApprove(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewNote } = ReviewRequestSchema.parse(req.body);
    const result = await approveRequest(req.tenantId, req.params['id']!, req.userId!, reviewNote);
    sendSuccess(res, result, 'Request approved');
  } catch (err) { next(err); }
}

export async function handleReject(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewNote } = ReviewRequestSchema.parse(req.body);
    const result = await rejectRequest(req.tenantId, req.params['id']!, req.userId!, reviewNote);
    sendSuccess(res, result, 'Request rejected');
  } catch (err) { next(err); }
}
