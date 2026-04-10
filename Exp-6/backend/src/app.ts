import express from "express";
import cookieParser from "cookie-parser";

import { authRouter } from "./auth/routes.js";
import { corsMiddleware } from "./config/cors.js";
import { env } from "./config/env.js";
import { buildSecurityMiddleware } from "./config/security.js";
import { electionsRouter } from "./elections/routes.js";
import { healthRouter, systemRouter } from "./health/routes.js";
import { inboxRouter } from "./inbox/routes.js";
import { keyRotationCronRouter } from "./internal/cron/key-rotation.route.js";
import { kycPurgeCronRouter } from "./internal/cron/kyc-purge.route.js";
import { reconcileCronRouter } from "./internal/cron/reconcile.route.js";
import { kycRouter } from "./kyc/routes.js";
import { appErrorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { globalApiIpRateLimit } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./lib/request-id.js";
import { observerRouter } from "./observer/routes.js";
import { rerunEciRouter } from "./rerun/routes-eci.js";
import { rerunOwnerRouter } from "./rerun/routes-owner.js";
import { uploadsRouter } from "./uploads/routes.js";
import { votesRouter } from "./votes/routes.js";
import { walletGovernanceRouter } from "./wallet-governance/routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(corsMiddleware);

  for (const middleware of buildSecurityMiddleware()) {
    app.use(middleware);
  }

  app.use(cookieParser());
  app.use(healthRouter);

  app.use(env.API_BASE_PATH, globalApiIpRateLimit);
  app.use(env.API_BASE_PATH, authRouter);
  app.use(env.API_BASE_PATH, uploadsRouter);
  app.use(env.API_BASE_PATH, kycRouter);
  app.use(env.API_BASE_PATH, electionsRouter);
  app.use(env.API_BASE_PATH, votesRouter);
  app.use(env.API_BASE_PATH, rerunOwnerRouter);
  app.use(env.API_BASE_PATH, rerunEciRouter);
  app.use(env.API_BASE_PATH, walletGovernanceRouter);
  app.use(env.API_BASE_PATH, observerRouter);
  app.use(env.API_BASE_PATH, inboxRouter);

  app.use(env.API_BASE_PATH, systemRouter);
  app.use(env.API_BASE_PATH, keyRotationCronRouter);
  app.use(env.API_BASE_PATH, kycPurgeCronRouter);
  app.use(env.API_BASE_PATH, reconcileCronRouter);

  app.use(notFoundHandler);
  app.use(appErrorHandler);

  return app;
}
