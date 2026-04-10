import { HeadObjectCommand } from "@aws-sdk/client-s3";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { redis } from "../db/redis.js";
import { r2Client } from "../db/r2.js";
import { appError } from "../lib/errors.js";
import { scanQueueService } from "../scans/scan-queue.service.js";

interface FinalizeUploadInput {
  contractId: string;
  objectKey: string;
  checksumSha256Hex: string;
}

interface UploadContractRecord {
  contractId: string;
  objectKey: string;
  wallet: string;
  electionId: string;
  constituencyId: string;
  submissionId: string;
  artifactType: "DOCUMENT" | "PROFILE_PHOTO";
  mimeType: string;
  fileSizeBytes: number;
  expiresAt: string;
}

interface FinalizeUploadResult {
  artifactId: string;
  objectKey: string;
  scanState: "PENDING";
  scanQueuedAt: string;
  finalizedAt: string;
}

function uploadContractKey(contractId: string): string {
  return `upload:contract:${contractId}`;
}

function parseContract(raw: string): UploadContractRecord {
  try {
    return JSON.parse(raw) as UploadContractRecord;
  } catch {
    throw appError.conflict("Upload contract is malformed");
  }
}

function assertChecksum(checksumSha256Hex: string): void {
  if (!/^[a-fA-F0-9]{64}$/.test(checksumSha256Hex)) {
    throw appError.validation("checksumSha256Hex must be 64 hex characters");
  }
}

export const uploadFinalizeService = {
  async finalize(input: FinalizeUploadInput): Promise<FinalizeUploadResult> {
    assertChecksum(input.checksumSha256Hex);

    const rawContract = await redis.get<string>(uploadContractKey(input.contractId));
    if (!rawContract) {
      throw appError.conflict("Upload contract is expired or missing");
    }

    const contract = parseContract(rawContract);

    if (contract.objectKey !== input.objectKey) {
      throw appError.conflict("Upload object key mismatch for contract");
    }

    if (new Date(contract.expiresAt).getTime() <= Date.now()) {
      await redis.del(uploadContractKey(input.contractId));
      throw appError.conflict("Upload contract has expired");
    }

    scanQueueService.assertScannerAvailable();

    const head = await r2Client.send(
      new HeadObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: input.objectKey
      })
    );

    const uploadedSize = Number(head.ContentLength ?? 0);
    if (uploadedSize <= 0) {
      throw appError.conflict("Uploaded object not found or empty");
    }

    if (uploadedSize !== contract.fileSizeBytes) {
      throw appError.conflict("Uploaded object size mismatch");
    }

    const scanTicket = scanQueueService.enqueueForScan();
    const finalizedAt = new Date().toISOString();

    const artifact = await prisma.uploadArtifact.update({
      where: {
        objectKey: input.objectKey
      },
      data: {
        checksumSha256Hex: input.checksumSha256Hex.toLowerCase(),
        finalizedAt: new Date(finalizedAt),
        scanState: "PENDING",
        scanQueuedAt: new Date(scanTicket.queuedAt)
      }
    });

    await redis.del(uploadContractKey(input.contractId));

    await prisma.kycSubmission.update({
      where: {
        id: contract.submissionId
      },
      data: {
        uploadFinalizedAt: new Date(finalizedAt)
      }
    });

    return {
      artifactId: artifact.id,
      objectKey: artifact.objectKey,
      scanState: "PENDING",
      scanQueuedAt: scanTicket.queuedAt,
      finalizedAt
    };
  }
};
