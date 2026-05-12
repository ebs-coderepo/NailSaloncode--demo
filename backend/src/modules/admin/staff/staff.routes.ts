import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import {
  handleList,
  handleGet,
  handleCreate,
  handleUpdate,
  handleDeactivate,
  handleGetMe,
  handleUpdateMe,
} from './staff.controller';

const router = Router();

// /me routes — any authenticated user with a staff profile
router.get('/me',    handleGetMe);
router.patch('/me',  handleUpdateMe);

// OWNER/MANAGER only
router.get('/',       requireRole('OWNER', 'MANAGER'), handleList);
router.post('/',      requireRole('OWNER', 'MANAGER'), handleCreate);
router.get('/:id',    requireRole('OWNER', 'MANAGER'), handleGet);
router.patch('/:id',  requireRole('OWNER', 'MANAGER'), handleUpdate);
router.delete('/:id', requireRole('OWNER'),             handleDeactivate);

export default router;
