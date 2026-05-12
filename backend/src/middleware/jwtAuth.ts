import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../shared/utils/apiResponse';
import { ErrorCode } from '../shared/types/api.types';

export type JwtPayload = {
  sub: string;       // userId
  tenantId: string;
  role: string;      // 'OWNER' | 'MANAGER' | 'STAFF'
  name: string;
  staffId?: string;  // populated if user has a linked staff profile
};

// ─────────────────────────────────────────────────────────────────────────────
// JWT auth middleware — validates Bearer token and populates req context.
// Applied to all /v1/admin/* routes.
// ─────────────────────────────────────────────────────────────────────────────
export function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    sendError(res, 'Authentication required', 401, ErrorCode.UNAUTHORIZED);
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.tenantId = payload.tenantId;
    req.userId   = payload.sub;
    req.userRole = payload.role;
    req.staffId  = payload.staffId;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401, ErrorCode.UNAUTHORIZED);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role guard — use after jwtAuthMiddleware.
// requireRole('OWNER', 'MANAGER') blocks STAFF with 403.
// ─────────────────────────────────────────────────────────────────────────────
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.userRole ?? '')) {
      sendError(res, 'You do not have permission to perform this action', 403, ErrorCode.FORBIDDEN);
      return;
    }
    next();
  };
}
