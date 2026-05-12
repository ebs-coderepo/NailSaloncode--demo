import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import {
  handleList,
  handleGet,
  handleCreate,
  handleUpdate,
  handleDelete,
} from './services.controller';

const router = Router();

// GET — all roles can view services
router.get('/',       handleList);
router.get('/:id',    handleGet);

// Mutations — OWNER and MANAGER only; STAFF cannot modify services
router.post('/',      requireRole('OWNER', 'MANAGER'), handleCreate);
router.patch('/:id',  requireRole('OWNER', 'MANAGER'), handleUpdate);
router.delete('/:id', requireRole('OWNER'),             handleDelete);

export default router;
