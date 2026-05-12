import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import {
  handleList,
  handleRecord,
  handleRefund,
  handleGetConfig,
  handleUpdateConfig,
} from './payments.controller';

const router = Router();

// Payment config (OWNER only)
router.get('/config',   requireRole('OWNER'), handleGetConfig);
router.patch('/config', requireRole('OWNER'), handleUpdateConfig);

// Payment records (OWNER + MANAGER)
router.get('/',                              handleList);
router.post('/',                             requireRole('OWNER', 'MANAGER'), handleRecord);
router.post('/:id/refund',                   requireRole('OWNER'), handleRefund);

export default router;
