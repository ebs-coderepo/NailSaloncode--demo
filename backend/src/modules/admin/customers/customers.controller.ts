import { Request, Response, NextFunction } from 'express';
import { listCustomers, getCustomer, ListCustomersSchema } from './customers.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = ListCustomersSchema.parse(req.query);
    const result = await listCustomers(req.tenantId, search);
    sendSuccess(res, result, `${result.count} customer${result.count !== 1 ? 's' : ''} retrieved`);
  } catch (err) { next(err); }
}

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await getCustomer(req.tenantId, req.params['id']!);
    sendSuccess(res, customer, 'Customer retrieved');
  } catch (err) { next(err); }
}
