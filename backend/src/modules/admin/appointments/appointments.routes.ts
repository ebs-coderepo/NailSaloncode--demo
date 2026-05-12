import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleList, handleGet, handleCancel, handleUpdateStatus, handleGetSlots, handleReschedule } from './appointments.controller';

const router = Router();

router.get('/',                                                      handleList);
router.get('/:id',                                                   handleGet);
router.get('/:id/slots',                                             handleGetSlots);
router.post('/:id/cancel',      requireRole('OWNER', 'MANAGER'),     handleCancel);
router.post('/:id/reschedule',  requireRole('OWNER', 'MANAGER'),     handleReschedule);
router.patch('/:id/status',     requireRole('OWNER', 'MANAGER'),     handleUpdateStatus);

export default router;
