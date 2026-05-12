import { Router } from 'express';
import { dashboardStats } from './dashboard.controller';

const router = Router();

// GET /v1/admin/dashboard/stats
router.get('/stats', dashboardStats);

export default router;
