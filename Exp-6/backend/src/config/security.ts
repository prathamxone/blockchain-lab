import express from "express";
import helmet from "helmet";

import type { RequestHandler } from "express";

export function buildSecurityMiddleware(): RequestHandler[] {
  return [
    helmet({
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "no-referrer" }
    }),
    express.json({ limit: "1mb", strict: true }),
    express.urlencoded({ extended: false, limit: "1mb" })
  ];
}
