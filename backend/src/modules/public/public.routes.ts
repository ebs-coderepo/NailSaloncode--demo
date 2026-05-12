import { Router } from 'express';
import {
  handleInfo,
  handleAvailability,
  handleBook,
  handleGetAppointment,
  handleCancel,
  handleReschedule,
  handleGetReviewPage,
  handleSubmitReview,
  handlePublicReviews,
} from './public.controller';
import {
  handleGetPaymentInfo,
  handleCreateCheckout,
  handleVerifyPayment,
} from './payment.controller';

// No authentication — these endpoints are open to the public.
const router = Router();

// Salon info + booking
router.get('/:slug',               handleInfo);
router.get('/:slug/availability',  handleAvailability);
router.post('/:slug/book',         handleBook);
router.get('/:slug/reviews',       handlePublicReviews);

// Customer self-service (cancel / reschedule) — scoped to cancelToken
router.get('/appointment/:token',             handleGetAppointment);
router.post('/appointment/:token/cancel',     handleCancel);
router.post('/appointment/:token/reschedule', handleReschedule);

// Post-service review
router.get('/review/:token',    handleGetReviewPage);
router.post('/review/:token',   handleSubmitReview);

// Customer online payment — scoped to cancelToken
router.get('/pay/:token',           handleGetPaymentInfo);
router.post('/pay/:token/checkout', handleCreateCheckout);
router.post('/pay/:token/verify',   handleVerifyPayment);

export default router;
