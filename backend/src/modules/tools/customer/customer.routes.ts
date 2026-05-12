import { Router } from 'express';
import { handleLookup } from './customer.controller';

const router = Router();

// GET /v1/tools/customer?phone=+12125550100
router.get('/', handleLookup);

export default router;
