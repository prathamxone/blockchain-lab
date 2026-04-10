import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { rerunService } from "../rerun/rerun.service.js";
import { electionMirrorService } from "./election-mirror.service.js";
import { lineageService } from "./lineage.service.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional()
});

export const electionsRouter = Router();

function getElectionId(value: unknown): string {
  const electionId = String(value ?? "").trim();
  if (!electionId) {
    throw appError.validation("electionId path parameter is required");
  }

  return electionId;
}

electionsRouter.get("/elections", requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid elections list query");
  }

  const queryInput: {
    limit?: number | undefined;
    offset?: number | undefined;
    cursor?: string | undefined;
  } = {};

  if (parsed.data.limit !== undefined) {
    queryInput.limit = parsed.data.limit;
  }

  if (parsed.data.offset !== undefined) {
    queryInput.offset = parsed.data.offset;
  }

  if (parsed.data.cursor !== undefined) {
    queryInput.cursor = parsed.data.cursor;
  }

  const rows = await electionMirrorService.listElections(queryInput);
  sendSuccess(res, 200, rows);
});

electionsRouter.get("/elections/:electionId", requireAuth, async (req, res) => {
  const electionId = getElectionId(req.params.electionId);
  const detail = await electionMirrorService.getElectionById(electionId);

  if (!detail.election) {
    throw appError.notFound("Election not found");
  }

  sendSuccess(res, 200, detail);
});

electionsRouter.get("/results", requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid results list query");
  }

  const queryInput: {
    limit?: number | undefined;
    offset?: number | undefined;
    cursor?: string | undefined;
  } = {};

  if (parsed.data.limit !== undefined) {
    queryInput.limit = parsed.data.limit;
  }

  if (parsed.data.offset !== undefined) {
    queryInput.offset = parsed.data.offset;
  }

  if (parsed.data.cursor !== undefined) {
    queryInput.cursor = parsed.data.cursor;
  }

  const rows = await electionMirrorService.listResults(queryInput);
  sendSuccess(res, 200, rows);
});

electionsRouter.get("/results/:electionId", requireAuth, async (req, res) => {
  const electionId = getElectionId(req.params.electionId);
  const detail = await electionMirrorService.getResultByElectionId(electionId);

  if (!detail.result) {
    throw appError.notFound("Result not found for election");
  }

  sendSuccess(res, 200, detail);
});

electionsRouter.get("/elections/:electionId/lineage", requireAuth, async (req, res) => {
  const electionId = getElectionId(req.params.electionId);
  const lineage = await lineageService.getLineage(electionId);

  if (!lineage) {
    throw appError.notFound("Election lineage not found");
  }

  sendSuccess(res, 200, lineage);
});

electionsRouter.get("/elections/:electionId/rerun/status", requireAuth, async (req, res) => {
  const electionId = getElectionId(req.params.electionId);
  const status = await rerunService.getRerunStatus(electionId);

  if (!status) {
    throw appError.notFound("Election rerun status not found");
  }

  sendSuccess(res, 200, status);
});
