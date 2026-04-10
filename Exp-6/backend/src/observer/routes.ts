import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { anomalyWalletRateLimit } from "../middleware/rate-limit.js";
import { requireRoles } from "../roles/roles.middleware.js";
import { anomalyService } from "./anomaly.service.js";

const createAnomalySchema = z.object({
  electionId: z.string().min(1),
  constituencyId: z.string().optional(),
  category: z.string().min(1),
  detail: z.string().min(1)
});

const listAnomalyQuerySchema = z.object({
  electionId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional()
});

export const observerRouter = Router();

observerRouter.post(
  "/observer/anomalies",
  requireAuth,
  requireRoles("ADMIN", "ECI", "SRO", "RO", "OBSERVER"),
  anomalyWalletRateLimit,
  async (req, res) => {
    const parsed = createAnomalySchema.safeParse(req.body);
    if (!parsed.success) {
      throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid anomaly payload");
    }

    const created = await anomalyService.report({
      reportedByWallet: req.auth!.wallet,
      electionId: parsed.data.electionId,
      constituencyId: parsed.data.constituencyId,
      category: parsed.data.category,
      detail: parsed.data.detail
    });

    sendSuccess(res, 201, created);
  }
);

observerRouter.get(
  "/observer/anomalies",
  requireAuth,
  requireRoles("ADMIN", "ECI", "SRO", "RO", "OBSERVER"),
  async (req, res) => {
    const parsed = listAnomalyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid anomaly query");
    }

    const result = await anomalyService.list({
      electionId: parsed.data.electionId,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      cursor: parsed.data.cursor
    });

    sendSuccess(res, 200, result);
  }
);
