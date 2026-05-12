import 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId: string;    // set by toolAuthMiddleware OR jwtAuthMiddleware
      userId?: string;     // set by jwtAuthMiddleware
      userRole?: string;   // set by jwtAuthMiddleware — 'OWNER' | 'MANAGER' | 'STAFF'
      staffId?: string;    // set by jwtAuthMiddleware if user has a linked staff profile
    }
  }
}
