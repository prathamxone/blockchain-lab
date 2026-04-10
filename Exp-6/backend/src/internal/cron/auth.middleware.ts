import type { NextFunction, Request, Response } from "express";

import { env } from "../../config/env.js";
import { appError } from "../../lib/errors.js";

export function requireCronSecret(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;

  if (authorization !== expected) {
    next(appError.unauthorized("Unauthorized cron invocation"));
    return;
  }

  next();
}
