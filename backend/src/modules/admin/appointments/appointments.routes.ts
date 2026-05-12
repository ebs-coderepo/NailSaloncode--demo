import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleList, handleGet, handleCancel, handleUpdateStatus } from './appointments.controller';

const router = Router();

router.get('/',                                            handleList);
router.get('/:id',                                         handleGet);
router.post('/:id/cancel', requireRole('OWNER', 'MANAGER'), handleCancel);
router.patch('/:id/status', requireRole('OWNER', 'MANAGER'), handleUpdateStatus);

export default router;
