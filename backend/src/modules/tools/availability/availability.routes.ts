import { Router } from 'express';
import { handleAvailability } from './availability.controller';

const router = Router();

// GET /v1/tools/availability?serviceId=&date=YYYY-MM-DD[&staffId=]
router.get('/', handleAvailability);

export default router;
