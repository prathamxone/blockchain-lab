import { Router } from "express";

import { auditService } from "../../audit/audit.service.js";
import { prisma } from "../../db/prisma.js";
import { sendSuccess } from "../../lib/http.js";
import { requireCronSecret } from "./auth.middleware.js";

export const reconcileCronRouter = Router();

reconcileCronRouter.all("/internal/cron/reconcile-results", requireCronSecret, async (_req, res) => {
  const executedAt = new Date().toISOString();

  const updated = await prisma.electionMirror.updateMany({
    data: {
      lastSyncedAt: new Date(executedAt)
    }
  });

  await auditService.write({
    actorWallet: null,
    action: "CRON_RECONCILE_RESULTS_EXECUTED",
    entityType: "InternalCron",
    entityId: "reconcile-results",
    payload: {
      executedAt,
      touchedElectionMirrorRows: updated.count
    }
  });

  sendSuccess(res, 200, {
    job: "reconcile-results",
    executedAt,
    status: "ok",
    touchedElectionMirrorRows: updated.count
  });
});
