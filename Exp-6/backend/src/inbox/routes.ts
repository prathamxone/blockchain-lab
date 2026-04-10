import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { inboxService } from "./inbox.service.js";

const listInboxSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional()
});

export const inboxRouter = Router();

inboxRouter.get("/inbox", requireAuth, async (req, res) => {
  const parsed = listInboxSchema.safeParse(req.query);
  if (!parsed.success) {
    throw appError.validation(parsed.error.issues[0]?.message ?? "Invalid inbox query");
  }

  const input: {
    wallet: string;
    limit?: number | undefined;
    offset?: number | undefined;
    cursor?: string | undefined;
    unreadOnly?: boolean | undefined;
  } = {
    wallet: req.auth!.wallet
  };

  if (parsed.data.limit !== undefined) {
    input.limit = parsed.data.limit;
  }

  if (parsed.data.offset !== undefined) {
    input.offset = parsed.data.offset;
  }

  if (parsed.data.cursor !== undefined) {
    input.cursor = parsed.data.cursor;
  }

  if (parsed.data.unreadOnly !== undefined) {
    input.unreadOnly = parsed.data.unreadOnly;
  }

  const inbox = await inboxService.list(input);

  sendSuccess(res, 200, inbox);
});

inboxRouter.post("/inbox/:notificationId/read", requireAuth, async (req, res) => {
  const notificationId = String(req.params.notificationId ?? "").trim();
  if (!notificationId) {
    throw appError.validation("notificationId path parameter is required");
  }

  const result = await inboxService.markRead({
    wallet: req.auth!.wallet,
    notificationId
  });

  sendSuccess(res, 200, result);
});
