import { ErrorCodeValue } from '../types/api.types';

// Typed operational error.
// Throwing AppError signals "this is a known, expected failure" (4xx range).
// Anything else that bubbles up is treated as an unexpected 500.
//
// The errorHandler middleware checks instanceof AppError to decide whether to
// expose the message to the client or return a generic "Internal Server Error".

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCodeValue;
  public readonly isOperational: boolean = true;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCodeValue,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // Restore prototype chain — needed when extending built-in classes in TS
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
