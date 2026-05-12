import { Request, Response, NextFunction } from 'express';
import { prisma } from '../shared/db/prismaClient';
import { sendError } from '../shared/utils/apiResponse';
import { ErrorCode } from '../shared/types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Tool endpoint API key authentication
//
// The voice AI includes its tenant API key in the X-Api-Key header.
// We look it up in the database to resolve the tenantId, then attach it to
// the request context.
//
// SECURITY RULES:
//  1. tenantId is NEVER accepted from the request body/query — only derived here
//  2. The key lookup also checks isActive to reject suspended tenants immediately
//  3. Failed lookups always return 401 — no information about whether the key
//     exists vs. is inactive (avoids enumeration)
// ─────────────────────────────────────────────────────────────────────────────

export async function toolAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    sendError(
      res,
      'Missing X-Api-Key header',
      401,
      ErrorCode.INVALID_API_KEY,
    );
    return;
  }

  // Single DB read: resolve tenantId and check active status atomically.
  // Select only the columns we need — never pull the whole row for auth.
  const tenant = await prisma.tenant.findUnique({
    where: { apiKey },
    select: { id: true, isActive: true },
  });

  if (!tenant || !tenant.isActive) {
    // Intentionally same message for both "not found" and "inactive"
    sendError(
      res,
      'Invalid or inactive API key',
      401,
      ErrorCode.INVALID_API_KEY,
    );
    return;
  }

  // Attach tenantId to request context — all downstream handlers read from here
  req.tenantId = tenant.id;
  next();
}
