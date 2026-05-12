import { Router } from 'express';
import { requireRole } from '../../../middleware/jwtAuth';
import * as ctrl from './reviews.controller';

const router = Router();

// GET /v1/admin/reviews
router.get('/', ctrl.listReviews);

// PATCH /v1/admin/reviews/:id/visibility  — show or hide a review
router.patch('/:id/visibility', requireRole('OWNER', 'MANAGER'), ctrl.setVisibility);

// DELETE /v1/admin/reviews/:id
router.delete('/:id', requireRole('OWNER', 'MANAGER'), ctrl.deleteReview);

export default router;
