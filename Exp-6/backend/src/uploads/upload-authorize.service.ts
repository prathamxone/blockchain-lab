import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type UploadArtifactType } from "@prisma/client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { redis } from "../db/redis.js";
import { r2Client } from "../db/r2.js";
import { appError } from "../lib/errors.js";

interface AuthorizeUploadInput {
  wallet: string;
  electionId: string;
  constituencyId: string;
  submissionId: string;
  artifactType: UploadArtifactType;
  mimeType: string;
  fileExt: string;
  fileSizeBytes: number;
}

interface AuthorizeUploadResult {
  contractId: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
}

interface UploadContractRecord {
  contractId: string;
  objectKey: string;
  wallet: string;
  electionId: string;
  constituencyId: string;
  submissionId: string;
  artifactType: UploadArtifactType;
  mimeType: string;
  fileSizeBytes: number;
  expiresAt: string;
}

function uploadContractKey(contractId: string): string {
  return `upload:contract:${contractId}`;
}

function toFileExt(rawExt: string): string {
  const sanitized = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (!sanitized) {
    throw appError.validation("fileExt must be provided");
  }

  return sanitized;
}

function assertMimeAllowed(mimeType: string): void {
  const allowedPrefixes = ["image/", "application/pdf"];
  const allowed = allowedPrefixes.some((prefix) => mimeType.startsWith(prefix));

  if (!allowed) {
    throw appError.validation("Unsupported MIME type for upload authorization");
  }
}

function assertUploadSize(input: { artifactType: UploadArtifactType; fileSizeBytes: number }): void {
  if (input.fileSizeBytes <= 0) {
    throw appError.validation("fileSizeBytes must be greater than zero");
  }

  const maxBytes = input.artifactType === "PROFILE_PHOTO" ? env.UPLOAD_PROFILE_MAX_BYTES : env.UPLOAD_DOC_MAX_BYTES;
  if (input.fileSizeBytes > maxBytes) {
    throw appError.unprocessable(`File exceeds size limit for ${input.artifactType}`);
  }
}

function buildObjectKey(input: {
  wallet: string;
  electionId: string;
  constituencyId: string;
  submissionId: string;
  artifactType: UploadArtifactType;
  fileExt: string;
}): string {
  const artifact = input.artifactType === "PROFILE_PHOTO" ? "profile" : "document";
  return [
    "kyc",
    input.electionId,
    input.constituencyId,
    input.wallet.toLowerCase(),
    input.submissionId,
    `${artifact}-${Date.now()}.${input.fileExt}`
  ].join("/");
}

export const uploadAuthorizeService = {
  async authorize(input: AuthorizeUploadInput): Promise<AuthorizeUploadResult> {
    assertUploadSize(input);
    assertMimeAllowed(input.mimeType);

    const fileExt = toFileExt(input.fileExt);
    const objectKey = buildObjectKey({
      wallet: input.wallet,
      electionId: input.electionId,
      constituencyId: input.constituencyId,
      submissionId: input.submissionId,
      artifactType: input.artifactType,
      fileExt
    });

    const contractId = randomUUID();
    const expiresAtDate = new Date(Date.now() + env.UPLOAD_CONTRACT_TTL_SEC * 1000);
    const expiresAt = expiresAtDate.toISOString();

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: objectKey,
      ContentType: input.mimeType
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: env.UPLOAD_CONTRACT_TTL_SEC,
      signableHeaders: new Set(["content-type"])
    });

    const contractRecord: UploadContractRecord = {
      contractId,
      objectKey,
      wallet: input.wallet,
      electionId: input.electionId,
      constituencyId: input.constituencyId,
      submissionId: input.submissionId,
      artifactType: input.artifactType,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      expiresAt
    };

    await redis.set(uploadContractKey(contractId), JSON.stringify(contractRecord), {
      ex: env.UPLOAD_CONTRACT_TTL_SEC
    });

    await prisma.uploadArtifact.create({
      data: {
        submissionId: input.submissionId,
        wallet: input.wallet,
        electionId: input.electionId,
        constituencyId: input.constituencyId,
        artifactType: input.artifactType,
        objectKey,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        contractExpiresAt: expiresAtDate
      }
    });

    return {
      contractId,
      objectKey,
      uploadUrl,
      expiresAt
    };
  }
};
