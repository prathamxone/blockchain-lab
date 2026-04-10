import express from "express";
import helmetImport from "helmet";

import type { HelmetOptions } from "helmet";
import type { RequestHandler } from "express";

const helmet =
  (helmetImport as unknown as { default?: (options?: Readonly<HelmetOptions>) => RequestHandler }).default ??
  (helmetImport as unknown as (options?: Readonly<HelmetOptions>) => RequestHandler);

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
