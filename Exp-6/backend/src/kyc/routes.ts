import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { requireOwnerRole } from "../roles/roles.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { kycService } from "./kyc.service.js";

const createSchema = z.object({
  electionId: z.string().min(1),
  constituencyId: z.string().min(1),
  participantType: z.enum(["VOTER", "CANDIDATE"]),
  aadhaar: z.string().min(1),
  epic: z.string().optional(),
  isAadhaarOnly: z.boolean().optional(),
  reasonCode: z.string().optional(),
  additionalEvidenceRefs: z.array(z.string()).optional()
});

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "NEEDS_RESUBMISSION"]),
  reason: z.string().min(1)
});

const queueQuerySchema = z.object({
  electionId: z.string().min(1),
  constituencyId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0)
});

export const kycRouter = Router();

kycRouter.post("/kyc/submissions", requireAuth, async (req, res) => {
  const body = createSchema.parse(req.body);

  const submissionInput: {
    wallet: string;
    electionId: string;
    constituencyId: string;
    participantType: "VOTER" | "CANDIDATE";
    aadhaar: string;
    epic?: string | undefined;
    isAadhaarOnly?: boolean | undefined;
    reasonCode?: string | undefined;
    additionalEvidenceRefs?: string[] | undefined;
  } = {
    wallet: req.auth!.wallet,
    electionId: body.electionId,
    constituencyId: body.constituencyId,
    participantType: body.participantType,
    aadhaar: body.aadhaar
  };

  if (body.epic !== undefined) {
    submissionInput.epic = body.epic;
  }

  if (body.isAadhaarOnly !== undefined) {
    submissionInput.isAadhaarOnly = body.isAadhaarOnly;
  }

  if (body.reasonCode !== undefined) {
    submissionInput.reasonCode = body.reasonCode;
  }

  if (body.additionalEvidenceRefs !== undefined) {
    submissionInput.additionalEvidenceRefs = body.additionalEvidenceRefs;
  }

  const created = await kycService.createSubmission(submissionInput);

  sendSuccess(res, 201, created);
});

kycRouter.post("/kyc/submissions/:submissionId/submit", requireAuth, async (req, res) => {
  const submissionId = String(req.params.submissionId ?? "").trim();
  if (!submissionId) {
    throw appError.validation("submissionId path parameter is required");
  }

  const queue = await kycService.submitSubmission({
    wallet: req.auth!.wallet,
    submissionId
  });

  sendSuccess(res, 200, queue);
});

kycRouter.get("/kyc/me", requireAuth, async (req, res) => {
  const electionId = String(req.query.electionId ?? "").trim();
  if (!electionId) {
    throw appError.validation("electionId query parameter is required");
  }

  const record = await kycService.getWalletSubmission({
    wallet: req.auth!.wallet,
    electionId
  });

  sendSuccess(res, 200, {
    submission: record
  });
});

kycRouter.get("/owner/kyc/queue", requireAuth, requireOwnerRole, async (req, res) => {
  const query = queueQuerySchema.parse(req.query);

  const whereClause: { electionId: string; constituencyId?: string } = {
    electionId: query.electionId
  };

  if (query.constituencyId) {
    whereClause.constituencyId = query.constituencyId;
  }

  const rows = await kycService.getOwnerQueue(whereClause, query.limit, query.offset);
  sendSuccess(res, 200, rows);
});

kycRouter.post("/owner/kyc/:submissionId/decision", requireAuth, requireOwnerRole, async (req, res) => {
  const submissionId = String(req.params.submissionId ?? "").trim();
  if (!submissionId) {
    throw appError.validation("submissionId path parameter is required");
  }

  const body = reviewSchema.parse(req.body);

  const result = await kycService.reviewSubmission({
    actorWallet: req.auth!.wallet,
    actorRole: req.auth!.role,
    submissionId,
    decision: body.decision,
    reason: body.reason
  });

  sendSuccess(res, 200, result);
});
