// ─────────────────────────────────────────────────────────────────────────────
// Canonical API response envelope
//
// ALL tool endpoints the voice AI calls must return this shape.
// Consistency here is what makes the voice AI deterministic — it always knows
// where to find data, whether the call succeeded, and the human-readable reason.
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error codes
// Machine-readable strings the voice AI can branch on.
// e.g. "SLOT_TAKEN" → "I'm sorry, that time is no longer available…"
// ─────────────────────────────────────────────────────────────────────────────
export const ErrorCode = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Tenant
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_INACTIVE: 'TENANT_INACTIVE',

  // Services
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',

  // Availability / Booking
  NO_AVAILABILITY: 'NO_AVAILABILITY',
  SLOT_TAKEN: 'SLOT_TAKEN',
  OUTSIDE_WORKING_HOURS: 'OUTSIDE_WORKING_HOURS',
  STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
  LOCK_ACQUIRE_FAILED: 'LOCK_ACQUIRE_FAILED',

  // Appointments
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_ALREADY_CANCELLED: 'APPOINTMENT_ALREADY_CANCELLED',

  // Customer
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',

  // Generic
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
