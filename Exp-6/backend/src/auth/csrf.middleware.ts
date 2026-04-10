import type { NextFunction, Request, Response } from "express";

import { appError } from "../lib/errors.js";
import { tokenService } from "./token.service.js";

export function csrfProtect(req: Request, _res: Response, next: NextFunction): void {
  const headerToken = req.header("x-csrf-token");
  const cookieToken = req.cookies?.[tokenService.csrfCookieName()] as string | undefined;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    next(appError.forbidden("Invalid CSRF token"));
    return;
  }

  next();
}
