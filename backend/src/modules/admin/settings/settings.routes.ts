import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import { handleGet, handleUpdate } from './settings.controller';

const router = Router();

router.get('/',   handleGet);
router.patch('/', requireRole('OWNER'), handleUpdate);

export default router;
