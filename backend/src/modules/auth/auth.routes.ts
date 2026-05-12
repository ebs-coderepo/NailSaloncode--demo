import { Router } from 'express';
import { handleLogin } from './auth.controller';

const router = Router();

// POST /v1/auth/login
router.post('/login', handleLogin);

export default router;
