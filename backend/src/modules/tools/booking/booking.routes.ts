import { Router } from 'express';
import { handleBook } from './booking.controller';

const router = Router();

// POST /v1/tools/appointments
router.post('/', handleBook);

export default router;
