import { Request, Response, NextFunction } from 'express';
import {
  getSalonInfo,
  getAvailability,
  createBooking,
  getAppointmentByToken,
  cancelAppointment,
  rescheduleByToken,
  getAppointmentForReview,
  submitReview,
  getPublicReviews,
  AvailabilityQuerySchema,
  BookingSchema,
  CancelSchema,
  RescheduleSchema,
  ReviewSubmitSchema,
} from './public.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export async function handleInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getSalonInfo(req.params['slug']!);
    sendSuccess(res, data, 'Salon info retrieved');
  } catch (err) { next(err); }
}

export async function handleAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const query = AvailabilityQuerySchema.parse(req.query);
    const slots = await getAvailability(req.params['slug']!, query);
    sendSuccess(res, { slots, count: slots.length }, 'Availability retrieved');
  } catch (err) { next(err); }
}

export async function handleBook(req: Request, res: Response, next: NextFunction) {
  try {
    const input = BookingSchema.parse(req.body);
    const booking = await createBooking(req.params['slug']!, input);
    sendSuccess(res, booking, 'Appointment booked successfully', 201);
  } catch (err) { next(err); }
}

// ── Cancel / Reschedule ───────────────────────────────────────────────────────

export async function handleGetAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAppointmentByToken(req.params['token']!);
    sendSuccess(res, data, 'Appointment retrieved');
  } catch (err) { next(err); }
}

export async function handleCancel(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = CancelSchema.parse(req.body);
    const result = await cancelAppointment(req.params['token']!, reason);
    sendSuccess(res, result, 'Appointment cancelled');
  } catch (err) { next(err); }
}

export async function handleReschedule(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RescheduleSchema.parse(req.body);
    const result = await rescheduleByToken(req.params['token']!, input);
    sendSuccess(res, result, 'Appointment rescheduled');
  } catch (err) { next(err); }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function handleGetReviewPage(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAppointmentForReview(req.params['token']!);
    sendSuccess(res, data, 'OK');
  } catch (err) { next(err); }
}

export async function handleSubmitReview(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ReviewSubmitSchema.parse(req.body);
    const result = await submitReview(req.params['token']!, input);
    sendSuccess(res, result, 'Review submitted', 201);
  } catch (err) { next(err); }
}

export async function handlePublicReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await getPublicReviews(req.params['slug']!);
    sendSuccess(res, reviews, 'Reviews retrieved');
  } catch (err) { next(err); }
}
