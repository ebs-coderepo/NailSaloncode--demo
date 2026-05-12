import { Router } from 'express';
import { toolAuthMiddleware } from '../../middleware/toolAuth';
import servicesRouter      from './services/services.routes';
import availabilityRouter  from './availability/availability.routes';
import bookingRouter       from './booking/booking.routes';
import customerRouter      from './customer/customer.routes';

// ─────────────────────────────────────────────────────────────────────────────
// Tools router — voice AI tool endpoints.
// Mounted at /v1/tools in app.ts.
// toolAuthMiddleware validates X-Api-Key and attaches tenantId.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.use(toolAuthMiddleware);

router.use('/services',     servicesRouter);
router.use('/availability', availabilityRouter);
router.use('/appointments', bookingRouter);
router.use('/customer',     customerRouter);

export default router;
