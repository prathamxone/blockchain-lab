export type Retryability = "retryable" | "non-retryable";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "PAGINATION_CURSOR_INVALID"
  | "CLIENT_NONCE_INVALID_FORMAT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly retryability: Retryability;

  constructor(status: number, code: AppErrorCode, message: string, retryability: Retryability = "non-retryable") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.retryability = retryability;
  }
}

export const appError = {
  validation: (message: string) => new AppError(400, "VALIDATION_ERROR", message),
  paginationCursorInvalid: (message = "Cursor is invalid or expired") =>
    new AppError(400, "PAGINATION_CURSOR_INVALID", message),
  clientNonceInvalidFormat: (message = "clientNonce must be UUID v7") =>
    new AppError(422, "CLIENT_NONCE_INVALID_FORMAT", message),
  unauthorized: (message = "Authentication required") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Access denied") => new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Resource not found") => new AppError(404, "NOT_FOUND", message),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  unprocessable: (message: string) => new AppError(422, "UNPROCESSABLE", message),
  rateLimited: (message = "Too many requests") => new AppError(429, "RATE_LIMITED", message, "retryable"),
  serviceUnavailable: (message = "Service unavailable") =>
    new AppError(503, "SERVICE_UNAVAILABLE", message, "retryable"),
  internal: (message = "Internal server error") => new AppError(500, "INTERNAL_ERROR", message, "retryable")
};
