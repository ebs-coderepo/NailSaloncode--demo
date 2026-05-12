import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleGet, handleUpdate } from './voice-config.controller';

const router = Router();

router.get('/',   requireRole('OWNER', 'MANAGER'), handleGet);
router.patch('/', requireRole('OWNER', 'MANAGER'), handleUpdate);

export default router;
