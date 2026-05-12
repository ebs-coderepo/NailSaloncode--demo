import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/utils/AppError';
import { sendError } from '../shared/utils/apiResponse';
import { ErrorCode } from '../shared/types/api.types';
import { isProd } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler — must be registered LAST in app.ts
//
// Three error categories:
//  1. AppError   → operational / expected failure → expose message to client
//  2. ZodError   → validation failure → flatten and expose field errors
//  3. Unknown    → programming error → log stack, return generic 500
//
// In production we never leak stack traces or raw error messages for unknowns.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── 1. ZodError (request validation) ──────────────────────────────────────
  if (err instanceof ZodError) {
    const issues = err.flatten().fieldErrors;
    sendError(
      res,
      'Validation failed: ' + JSON.stringify(issues),
      422,
      ErrorCode.VALIDATION_ERROR,
    );
    return;
  }

  // ── 2. AppError (known operational errors) ─────────────────────────────────
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errorCode);
    return;
  }

  // ── 3. Unknown / programmer error ─────────────────────────────────────────
  console.error('Unhandled error:', err);

  sendError(
    res,
    isProd ? 'An unexpected error occurred' : String(err),
    500,
    ErrorCode.INTERNAL_ERROR,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 404 handler — for routes that don't match anything
// ─────────────────────────────────────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    `Route not found: ${req.method} ${req.path}`,
    404,
    ErrorCode.INTERNAL_ERROR,
  );
}
