import { Router } from 'express';
import { jwtAuthMiddleware } from '../../middleware/jwtAuth';
import dashboardRouter    from './dashboard/dashboard.routes';
import servicesRouter     from './services/services.routes';
import calendarRouter     from './calendar/calendar.routes';
import staffRouter        from './staff/staff.routes';
import appointmentsRouter from './appointments/appointments.routes';
import customersRouter    from './customers/customers.routes';
import settingsRouter     from './settings/settings.routes';
import voiceConfigRouter  from './voice-config/voice-config.routes';
import reviewsRouter      from './reviews/reviews.routes';
import usersRouter        from './users/users.routes';
import paymentsRouter     from './payments/payments.routes';
import financeRouter      from './finance/finance.routes';
import requestsRouter     from './requests/requests.routes';

// All /v1/admin/* routes require a valid JWT.
// Individual sub-routers apply additional requireRole() guards where needed.
const router = Router();

router.use(jwtAuthMiddleware);

router.use('/dashboard',    dashboardRouter);
router.use('/services',     servicesRouter);
router.use('/calendar',     calendarRouter);
router.use('/staff',        staffRouter);
router.use('/appointments', appointmentsRouter);
router.use('/customers',    customersRouter);
router.use('/settings',     settingsRouter);
router.use('/voice-config', voiceConfigRouter);
router.use('/reviews',      reviewsRouter);
router.use('/users',        usersRouter);
router.use('/payments',     paymentsRouter);
router.use('/finance',      financeRouter);
router.use('/requests',     requestsRouter);

export default router;
