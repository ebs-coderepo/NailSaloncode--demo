import { Request, Response, NextFunction } from 'express';
import {
  listAppointments,
  getAppointment,
  cancelAppt,
  changeStatus,
  getAvailableSlots,
  rescheduleAppt,
  ListAppointmentsSchema,
  CancelSchema,
  UpdateStatusSchema,
  AdminRescheduleSchema,
} from './appointments.service';
import { sendSuccess } from '../../../shared/utils/apiResponse';

export async function handleList(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListAppointmentsSchema.parse(req.query);
    const result = await listAppointments(req.tenantId, query);
    sendSuccess(res, result, `${result.count} appointment${result.count !== 1 ? 's' : ''} retrieved`);
  } catch (err) { next(err); }
}

export async function handleGet(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await getAppointment(req.tenantId, req.params['id']!);
    sendSuccess(res, appt, 'Appointment retrieved');
  } catch (err) { next(err); }
}

export async function handleCancel(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = CancelSchema.parse(req.body);
    const appt = await cancelAppt(req.tenantId, req.params['id']!, reason);
    sendSuccess(res, appt, 'Appointment cancelled');
  } catch (err) { next(err); }
}

export async function handleUpdateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = UpdateStatusSchema.parse(req.body);
    const appt = await changeStatus(req.tenantId, req.params['id']!, status);
    sendSuccess(res, appt, 'Appointment status updated');
  } catch (err) { next(err); }
}

export async function handleGetSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, staffId } = req.query as { date?: string; staffId?: string };
    if (!date) { res.status(400).json({ success: false, message: 'date query param is required' }); return; }
    const result = await getAvailableSlots(req.tenantId, req.params['id']!, date, staffId);
    sendSuccess(res, result, `${result.slots.length} slot(s) available`);
  } catch (err) { next(err); }
}

export async function handleReschedule(req: Request, res: Response, next: NextFunction) {
  try {
    const input = AdminRescheduleSchema.parse(req.body);
    const appt  = await rescheduleAppt(req.tenantId, req.params['id']!, input);
    sendSuccess(res, appt, 'Appointment rescheduled');
  } catch (err) { next(err); }
}
