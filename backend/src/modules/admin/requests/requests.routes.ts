import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleList, handleSubmit, handleApprove, handleReject } from './requests.controller';

const router = Router();

// Any authenticated user can view and submit requests
router.get('/',                                             handleList);
router.post('/appointment/:appointmentId',                  handleSubmit);

// Only owner/manager can approve or reject
router.post('/:id/approve', requireRole('OWNER', 'MANAGER'), handleApprove);
router.post('/:id/reject',  requireRole('OWNER', 'MANAGER'), handleReject);

export default router;
