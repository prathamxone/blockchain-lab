import { Router } from "express";

import { auditService } from "../../audit/audit.service.js";
import { sendSuccess } from "../../lib/http.js";
import { requireCronSecret } from "./auth.middleware.js";

export const kycPurgeCronRouter = Router();

kycPurgeCronRouter.all("/internal/cron/kyc-purge", requireCronSecret, async (_req, res) => {
  const executedAt = new Date().toISOString();

  await auditService.write({
    actorWallet: null,
    action: "CRON_KYC_PURGE_EXECUTED",
    entityType: "InternalCron",
    entityId: "kyc-purge",
    payload: {
      executedAt,
      executionMode: "stub",
      holdFlagAware: true
    }
  });

  sendSuccess(res, 200, {
    job: "kyc-purge",
    executedAt,
    status: "ok",
    executionMode: "stub",
    holdFlagAware: true
  });
});
