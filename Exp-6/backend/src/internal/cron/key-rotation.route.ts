import { Router } from "express";

import { auditService } from "../../audit/audit.service.js";
import { sendSuccess } from "../../lib/http.js";
import { requireCronSecret } from "./auth.middleware.js";

export const keyRotationCronRouter = Router();

keyRotationCronRouter.all("/internal/cron/key-rotation", requireCronSecret, async (_req, res) => {
  const executedAt = new Date().toISOString();

  await auditService.write({
    actorWallet: null,
    action: "CRON_KEY_ROTATION_CHECK_EXECUTED",
    entityType: "InternalCron",
    entityId: "key-rotation",
    payload: {
      executedAt,
      executionMode: "stub"
    }
  });

  sendSuccess(res, 200, {
    job: "key-rotation",
    executedAt,
    status: "ok",
    executionMode: "stub"
  });
});
