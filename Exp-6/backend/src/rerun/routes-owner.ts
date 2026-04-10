import { RoleName } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { requireRoles } from "../roles/roles.middleware.js";
import { escalationService } from "./escalation.service.js";

const createTicketSchema = z.object({
  reasonCategory: z.string().min(1),
  reasonNote: z.string().min(1),
  evidenceHashRef: z.string().min(1)
});

export const rerunOwnerRouter = Router();

rerunOwnerRouter.post(
  "/owner/elections/:electionId/rerun/escalation-ticket",
  requireAuth,
  requireRoles("ADMIN"),
  async (req, res) => {
    const electionId = String(req.params.electionId ?? "").trim();
    if (!electionId) {
      throw appError.validation("electionId path parameter is required");
    }

    const parsedBody = createTicketSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw appError.validation(parsedBody.error.issues[0]?.message ?? "Invalid escalation payload");
    }

    const created = await escalationService.createTicket({
      electionId,
      createdByWallet: req.auth!.wallet,
      createdByRole: req.auth!.role as RoleName,
      reasonCategory: parsedBody.data.reasonCategory,
      reasonNote: parsedBody.data.reasonNote,
      evidenceHashRef: parsedBody.data.evidenceHashRef
    });

    sendSuccess(res, 201, created);
  }
);
