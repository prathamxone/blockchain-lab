import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { voteWalletRateLimit } from "../middleware/rate-limit.js";
import { voteRelayService } from "./vote-relay.service.js";
import { voteTokenService } from "./vote-token.service.js";

const tokenRequestSchema = z.object({
  electionId: z.string().min(1)
});

const castVoteSchema = z.object({
  electionId: z.string().min(1),
  clientNonce: z.string().min(1),
  voteToken: z.string().min(1),
  candidateId: z.string().min(1)
});

const statusLookupSchema = z.object({
  voteIntentId: z.string().optional(),
  wallet: z.string().optional(),
  electionId: z.string().optional(),
  clientNonce: z.string().optional()
});

export const votesRouter = Router();

votesRouter.post("/votes/token", requireAuth, voteWalletRateLimit, async (req, res) => {
  const parsed = tokenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid vote token request");
  }

  const token = await voteTokenService.issue({
    wallet: req.auth!.wallet,
    electionId: parsed.data.electionId
  });

  sendSuccess(res, 200, token);
});

votesRouter.post("/votes/cast", requireAuth, voteWalletRateLimit, async (req, res) => {
  const parsed = castVoteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid vote cast payload");
  }

  const result = await voteRelayService.cast({
    wallet: req.auth!.wallet,
    electionId: parsed.data.electionId,
    clientNonce: parsed.data.clientNonce,
    voteToken: parsed.data.voteToken,
    payload: {
      candidateId: parsed.data.candidateId
    }
  });

  sendSuccess(res, 200, result);
});

votesRouter.get("/votes/status", requireAuth, async (req, res) => {
  const parsed = statusLookupSchema.safeParse(req.query);
  if (!parsed.success) {
    throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid vote status query");
  }

  const status = await voteRelayService.lookupStatus({
    voteIntentId: parsed.data.voteIntentId,
    wallet: parsed.data.wallet ?? req.auth!.wallet,
    electionId: parsed.data.electionId,
    clientNonce: parsed.data.clientNonce
  });

  sendSuccess(res, 200, status);
});
