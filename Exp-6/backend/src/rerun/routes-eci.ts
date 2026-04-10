import { RoleName } from "@prisma/client";
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { requireRoles } from "../roles/roles.middleware.js";
import { escalationService } from "./escalation.service.js";

export const rerunEciRouter = Router();

rerunEciRouter.post(
  "/eci/elections/:electionId/rerun/execute",
  requireAuth,
  requireRoles("ECI"),
  async (req, res) => {
    const electionId = String(req.params.electionId ?? "").trim();
    if (!electionId) {
      throw appError.validation("electionId path parameter is required");
    }

    const result = await escalationService.executeRerun({
      electionId,
      actorWallet: req.auth!.wallet,
      actorRole: req.auth!.role as RoleName
    });

    sendSuccess(res, 200, result);
  }
);
