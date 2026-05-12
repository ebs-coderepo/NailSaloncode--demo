import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleList, handleGet } from './customers.controller';

const router = Router();

router.get('/',    requireRole('OWNER', 'MANAGER'), handleList);
router.get('/:id', requireRole('OWNER', 'MANAGER'), handleGet);

export default router;
