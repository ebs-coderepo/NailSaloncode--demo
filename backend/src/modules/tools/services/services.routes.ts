import { Router } from 'express';
import { listServices } from './services.controller';

// ─────────────────────────────────────────────────────────────────────────────
// Services routes (tool-facing)
//
// Mounted under /v1/tools — auth middleware is applied at the parent router
// level (tools.routes.ts), so no auth concern here.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

/**
 * GET /v1/tools/services
 *
 * Returns all active services for the authenticated tenant.
 * Used by the voice AI to present the service menu to the caller.
 *
 * Auth: X-Api-Key header (resolved to tenantId by toolAuthMiddleware)
 *
 * Response shape:
 * {
 *   success: true,
 *   message: "N services retrieved",
 *   data: {
 *     services: [ { id, name, description, duration, durationDisplay, price, priceRaw } ],
 *     count: N
 *   },
 *   errorCode: null
 * }
 */
router.get('/', listServices);

export default router;
