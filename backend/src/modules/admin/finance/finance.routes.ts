import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleSummary } from './finance.controller';

const router = Router();

router.get('/summary', requireRole('OWNER', 'MANAGER'), handleSummary);

export default router;
