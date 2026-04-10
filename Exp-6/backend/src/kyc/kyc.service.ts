import { KycState, Prisma } from "@prisma/client";

import { APP_CONSTANTS } from "../config/constants.js";
import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";
import { kycCryptoService } from "./kyc.crypto.service.js";
import { kycQueueService } from "./kyc.queue.service.js";
import { type KycSubmissionInput, validateKycSubmissionInput } from "./kyc.validators.js";

interface DecisionInput {
  actorWallet: string;
  actorRole: string;
  submissionId: string;
  decision: "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION";
  reason: string;
}

async function writeAuditLog(input: {
  actorWallet: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorWallet: input.actorWallet,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload as Prisma.InputJsonValue,
      entryHash: `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
  });
}

function toKycState(decision: DecisionInput["decision"]): KycState {
  if (decision === "APPROVED") {
    return KycState.APPROVED;
  }

  if (decision === "REJECTED") {
    return KycState.REJECTED;
  }

  return KycState.NEEDS_RESUBMISSION;
}

export const kycService = {
  async createSubmission(input: KycSubmissionInput): Promise<{ submissionId: string; state: KycState }> {
    const validated = validateKycSubmissionInput(input);

    const duplicate = await prisma.kycSubmission.findFirst({
      where: {
        electionId: validated.electionId,
        OR: [
          { aadhaarHash: validated.canonical.aadhaarHash },
          validated.canonical.epicHash ? { epicHash: validated.canonical.epicHash } : undefined
        ].filter(Boolean) as Array<{ aadhaarHash: string } | { epicHash: string }>
      },
      select: { id: true }
    });

    if (duplicate) {
      throw appError.conflict("Duplicate identity detected for election scope");
    }

    const encrypted = kycCryptoService.buildEncryptedIdentityEnvelope({
      participantType: validated.participantType,
      aadhaarCanonical: validated.canonical.aadhaarCanonical,
      epicCanonical: validated.canonical.epicCanonical,
      isAadhaarOnly: validated.isAadhaarOnly,
      reasonCode: validated.reasonCode,
      additionalEvidenceRefs: validated.additionalEvidenceRefs
    });

    const created = await prisma.kycSubmission.create({
      data: {
        wallet: validated.wallet,
        electionId: validated.electionId,
        constituencyId: validated.constituencyId,
        state: KycState.DRAFT,
        encryptedPayload: encrypted.encryptedPayload,
        encryptedDek: encrypted.encryptedDek,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        aadhaarHash: validated.canonical.aadhaarHash,
        epicHash: validated.canonical.epicHash,
        isAadhaarOnly: validated.isAadhaarOnly,
        reasonCodeHash: encrypted.reasonCodeHash
      }
    });

    await writeAuditLog({
      actorWallet: validated.wallet,
      action: "KYC_SUBMISSION_CREATED",
      entityType: "KycSubmission",
      entityId: created.id,
      payload: {
        participantType: validated.participantType,
        isAadhaarOnly: validated.isAadhaarOnly
      }
    });

    return {
      submissionId: created.id,
      state: created.state
    };
  },

  async submitSubmission(input: { wallet: string; submissionId: string }): Promise<{ queueId: string; sequenceNo: number }> {
    const submission = await prisma.kycSubmission.findUnique({
      where: { id: input.submissionId }
    });

    if (!submission) {
      throw appError.notFound("KYC submission not found");
    }

    if (submission.wallet.toLowerCase() !== input.wallet.toLowerCase()) {
      throw appError.forbidden("Cannot submit another wallet's KYC submission");
    }

    if (submission.state !== KycState.DRAFT && submission.state !== KycState.NEEDS_RESUBMISSION) {
      throw appError.conflict("Submission is not in a submittable state");
    }

    const finalizedArtifacts = await prisma.uploadArtifact.count({
      where: {
        submissionId: submission.id,
        finalizedAt: { not: null }
      }
    });

    if (finalizedArtifacts < APP_CONSTANTS.kycSubmitMinFinalizedArtifacts) {
      throw appError.unprocessable(
        `KYC submit requires at least ${APP_CONSTANTS.kycSubmitMinFinalizedArtifacts} finalized artifacts`
      );
    }

    const submittedAt = new Date();

    await prisma.kycSubmission.update({
      where: { id: submission.id },
      data: {
        state: KycState.SUBMITTED,
        submittedAt
      }
    });

    const queue = await kycQueueService.enqueueSubmission({
      submissionId: submission.id,
      electionId: submission.electionId,
      constituencyId: submission.constituencyId
    });

    await prisma.kycSubmission.update({
      where: { id: submission.id },
      data: {
        state: KycState.QUEUED
      }
    });

    await writeAuditLog({
      actorWallet: input.wallet,
      action: "KYC_SUBMISSION_QUEUED",
      entityType: "KycSubmission",
      entityId: submission.id,
      payload: {
        queueId: queue.queueId,
        sequenceNo: queue.sequenceNo
      }
    });

    return queue;
  },

  async getWalletSubmission(input: { wallet: string; electionId: string }): Promise<{
    submissionId: string;
    state: KycState;
    submittedAt: string | null;
    isAadhaarOnly: boolean;
  } | null> {
    const record = await prisma.kycSubmission.findFirst({
      where: {
        wallet: input.wallet,
        electionId: input.electionId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!record) {
      return null;
    }

    return {
      submissionId: record.id,
      state: record.state,
      submittedAt: record.submittedAt ? record.submittedAt.toISOString() : null,
      isAadhaarOnly: record.isAadhaarOnly
    };
  },

  async getOwnerQueue(
    whereInput: { electionId: string; constituencyId?: string },
    limit: number,
    offset: number
  ): Promise<{
    items: Array<{
      queueId: string;
      submissionId: string;
      sequenceNo: number;
      electionId: string;
      constituencyId: string;
      state: KycState;
      submittedAt: string | null;
    }>;
    pagination: { limit: number; offset: number };
  }> {
    const whereClause: { electionId: string; constituencyId?: string } = {
      electionId: whereInput.electionId
    };

    if (whereInput.constituencyId) {
      whereClause.constituencyId = whereInput.constituencyId;
    }

    const queueItems = await prisma.kycQueueItem.findMany({
      where: whereClause,
      orderBy: [
        { sequenceNo: "asc" },
        { createdAt: "asc" }
      ],
      take: limit,
      skip: offset
    });

    const submissionIds = queueItems.map((item) => item.submissionId);
    const submissions = submissionIds.length
      ? await prisma.kycSubmission.findMany({
          where: {
            id: { in: submissionIds }
          },
          select: {
            id: true,
            state: true,
            submittedAt: true
          }
        })
      : [];

    const bySubmissionId = new Map(submissions.map((item) => [item.id, item]));

    return {
      items: queueItems.map((item) => {
        const submission = bySubmissionId.get(item.submissionId);
        return {
          queueId: item.id,
          submissionId: item.submissionId,
          sequenceNo: item.sequenceNo,
          electionId: item.electionId,
          constituencyId: item.constituencyId,
          state: submission?.state ?? KycState.QUEUED,
          submittedAt: submission?.submittedAt ? submission.submittedAt.toISOString() : null
        };
      }),
      pagination: {
        limit,
        offset
      }
    };
  },

  async reviewSubmission(input: DecisionInput): Promise<{ submissionId: string; state: KycState }> {
    const submission = await prisma.kycSubmission.findUnique({
      where: { id: input.submissionId }
    });

    if (!submission) {
      throw appError.notFound("KYC submission not found");
    }

    const nextState = toKycState(input.decision);

    const updated = await prisma.kycSubmission.update({
      where: {
        id: input.submissionId
      },
      data: {
        state: nextState
      }
    });

    await writeAuditLog({
      actorWallet: input.actorWallet,
      action: "KYC_REVIEW_DECISION",
      entityType: "KycSubmission",
      entityId: input.submissionId,
      payload: {
        actorRole: input.actorRole,
        decision: input.decision,
        reason: input.reason
      }
    });

    return {
      submissionId: updated.id,
      state: updated.state
    };
  }
};
