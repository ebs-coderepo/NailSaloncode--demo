import { Request, Response, NextFunction } from 'express';
import {
  listServices,
  getService,
  addService,
  editService,
  removeService,
  CreateServiceSchema,
  UpdateServiceSchema,
} from './services.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listServices(req.tenantId);
    sendSuccess(res, result, `${result.count} service${result.count !== 1 ? 's' : ''} retrieved`);
  } catch (err) { next(err); }
}

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await getService(req.tenantId, req.params['id']!);
    sendSuccess(res, service, 'Service retrieved');
  } catch (err) { next(err); }
}

export async function handleCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateServiceSchema.parse(req.body);
    const service = await addService(req.tenantId, input);
    sendSuccess(res, service, 'Service created', 201);
  } catch (err) { next(err); }
}

export async function handleUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateServiceSchema.parse(req.body);
    const service = await editService(req.tenantId, req.params['id']!, input);
    sendSuccess(res, service, 'Service updated');
  } catch (err) { next(err); }
}

export async function handleDelete(req: Request, res: Response, next: NextFunction) {
  try {
    await removeService(req.tenantId, req.params['id']!);
    sendSuccess(res, null, 'Service deleted');
  } catch (err) { next(err); }
}
