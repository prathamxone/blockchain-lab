import type { Response } from "express";

import type { Retryability } from "./errors.js";

export interface ApiSuccess<T> {
  ok: true;
  requestId: string;
  data: T;
}

export interface ApiError {
  ok: false;
  requestId: string;
  error: {
    code: string;
    message: string;
    retryability: Retryability;
  };
}

export function sendSuccess<T>(res: Response, status: number, data: T): void {
  const body: ApiSuccess<T> = {
    ok: true,
    requestId: res.getHeader("X-Request-Id") as string,
    data
  };

  res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  retryability: Retryability
): void {
  const body: ApiError = {
    ok: false,
    requestId: res.getHeader("X-Request-Id") as string,
    error: {
      code,
      message,
      retryability
    }
  };

  res.status(status).json(body);
}
