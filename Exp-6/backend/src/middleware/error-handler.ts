import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../lib/errors.js";
import { sendError } from "../lib/http.js";
import { logger } from "../lib/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.path}`, "non-retryable");
}

export function appErrorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    logger.warn("Handled app error", {
      requestId: req.requestId,
      status: error.status,
      code: error.code,
      message: error.message
    });

    sendError(res, error.status, error.code, error.message, error.retryability);
    return;
  }

  if (error instanceof Error && error.message.startsWith("CORS_ORIGIN_FORBIDDEN:")) {
    logger.warn("CORS rejection", {
      requestId: req.requestId,
      message: error.message
    });
    sendError(res, 403, "FORBIDDEN", "Origin is not allowed", "non-retryable");
    return;
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Request validation failed";
    logger.warn("Zod validation rejection", {
      requestId: req.requestId,
      message
    });
    sendError(res, 400, "VALIDATION_ERROR", message, "non-retryable");
    return;
  }

  logger.error("Unhandled error", {
    requestId: req.requestId,
    message: error instanceof Error ? error.message : "Unknown error"
  });
  sendError(res, 500, "INTERNAL_ERROR", "Internal server error", "retryable");
}
