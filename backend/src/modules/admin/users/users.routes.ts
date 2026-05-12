import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import {
  handleList,
  handleGet,
  handleCreate,
  handleUpdate,
  handleResetPassword,
  handleChangePassword,
} from './users.controller';

const router = Router();

// Any authenticated user can change their own password
router.post('/change-password', handleChangePassword);

// OWNER only — manage team login accounts
router.get('/',         requireRole('OWNER'), handleList);
router.post('/',        requireRole('OWNER'), handleCreate);
router.get('/:id',      requireRole('OWNER'), handleGet);
router.patch('/:id',    requireRole('OWNER'), handleUpdate);
router.post('/:id/reset-password', requireRole('OWNER'), handleResetPassword);

export default router;
