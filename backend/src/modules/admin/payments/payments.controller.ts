import { Request, Response, NextFunction } from 'express';
import {
  listPayments,
  recordPayment,
  refundPayment,
  getPaymentConfig,
  savePaymentConfig,
  ListPaymentsSchema,
  RecordPaymentSchema,
  UpdatePaymentConfigSchema,
} from './payments.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListPaymentsSchema.parse(req.query);
    const result = await listPayments(req.tenantId, query);
    sendSuccess(res, result, `${result.count} payment${result.count !== 1 ? 's' : ''} retrieved`);
  } catch (err) { next(err); }
}

export async function handleRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RecordPaymentSchema.parse(req.body);
    const payment = await recordPayment(req.tenantId, input);
    sendSuccess(res, payment, 'Payment recorded', 201);
  } catch (err) { next(err); }
}

export async function handleRefund(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await refundPayment(req.tenantId, req.params['id']!);
    sendSuccess(res, payment, 'Payment refunded');
  } catch (err) { next(err); }
}

export async function handleGetConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getPaymentConfig(req.tenantId);
    sendSuccess(res, config, 'Payment config retrieved');
  } catch (err) { next(err); }
}

export async function handleUpdateConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdatePaymentConfigSchema.parse(req.body);
    const config = await savePaymentConfig(req.tenantId, input);
    sendSuccess(res, config, 'Payment config saved');
  } catch (err) { next(err); }
}
