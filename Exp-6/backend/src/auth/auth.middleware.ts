import type { NextFunction, Request, Response } from "express";

import { appError } from "../lib/errors.js";
import { sessionService } from "../sessions/session.service.js";
import { tokenService } from "./token.service.js";

function extractBearerToken(req: Request): string {
  const authorization = req.header("authorization");
  if (!authorization) {
    throw appError.unauthorized("Missing bearer token");
  }

  const [scheme, token] = authorization.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    throw appError.unauthorized("Malformed bearer token");
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    const claims = await tokenService.verifyAccessToken(token);
    const session = await sessionService.assertActiveSession(claims.sessionId, claims.wallet);

    req.auth = {
      wallet: session.wallet,
      role: session.role,
      sessionId: session.sessionId
    };

    await sessionService.touchSession(session.sessionId);
    next();
  } catch (error) {
    next(error);
  }
}
