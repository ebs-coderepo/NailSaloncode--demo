import { Response } from 'express';
import { ApiResponse, ErrorCodeValue } from '../types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Centralized response helpers
//
// Always go through these instead of calling res.json() directly.
// This guarantees every response — success or failure — matches the ApiResponse
// envelope that the voice AI and frontend expect.
// ─────────────────────────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string,
  statusCode = 200,
): void {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    errorCode: null,
  };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number,
  errorCode: ErrorCodeValue,
): void {
  const body: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    errorCode,
  };
  res.status(statusCode).json(body);
}
