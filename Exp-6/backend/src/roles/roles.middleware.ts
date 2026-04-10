import type { NextFunction, Request, Response } from "express";

import { appError } from "../lib/errors.js";

export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(appError.unauthorized("Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(appError.forbidden("Role is not permitted for this route"));
      return;
    }

    next();
  };
}

export const requireOwnerRole = requireRoles("ADMIN", "ECI", "SRO", "RO");
