import { Router } from "express";
import { z } from "zod";

import { sendSuccess } from "../lib/http.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { uploadAuthorizeService } from "./upload-authorize.service.js";
import { uploadFinalizeService } from "./upload-finalize.service.js";

const authorizeSchema = z.object({
  submissionId: z.string().min(1),
  electionId: z.string().min(1),
  constituencyId: z.string().min(1),
  artifactType: z.enum(["DOCUMENT", "PROFILE_PHOTO"]),
  mimeType: z.string().min(1),
  fileExt: z.string().min(1),
  fileSizeBytes: z.number().int().positive()
});

const finalizeSchema = z.object({
  contractId: z.string().uuid(),
  objectKey: z.string().min(1),
  checksumSha256Hex: z.string().regex(/^[a-fA-F0-9]{64}$/)
});

export const uploadsRouter = Router();

uploadsRouter.post("/uploads/authorize", requireAuth, async (req, res) => {
  const body = authorizeSchema.parse(req.body);

  const result = await uploadAuthorizeService.authorize({
    wallet: req.auth!.wallet,
    submissionId: body.submissionId,
    electionId: body.electionId,
    constituencyId: body.constituencyId,
    artifactType: body.artifactType,
    mimeType: body.mimeType,
    fileExt: body.fileExt,
    fileSizeBytes: body.fileSizeBytes
  });

  sendSuccess(res, 200, {
    ...result,
    uploadMethod: "PUT",
    requiredHeaders: {
      "Content-Type": body.mimeType
    }
  });
});

uploadsRouter.post("/uploads/finalize", requireAuth, async (req, res) => {
  const body = finalizeSchema.parse(req.body);

  const result = await uploadFinalizeService.finalize({
    contractId: body.contractId,
    objectKey: body.objectKey,
    checksumSha256Hex: body.checksumSha256Hex
  });

  sendSuccess(res, 200, result);
});
