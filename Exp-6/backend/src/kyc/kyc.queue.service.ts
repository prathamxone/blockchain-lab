import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";

interface EnqueueInput {
  submissionId: string;
  electionId: string;
  constituencyId: string;
}

export const kycQueueService = {
  async enqueueSubmission(input: EnqueueInput): Promise<{ queueId: string; sequenceNo: number }> {
    const existing = await prisma.kycQueueItem.findUnique({
      where: { submissionId: input.submissionId }
    });

    if (existing) {
      return {
        queueId: existing.id,
        sequenceNo: existing.sequenceNo
      };
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          const latest = await tx.kycQueueItem.findFirst({
            where: {
              electionId: input.electionId,
              constituencyId: input.constituencyId
            },
            orderBy: { sequenceNo: "desc" }
          });

          return tx.kycQueueItem.create({
            data: {
              submissionId: input.submissionId,
              electionId: input.electionId,
              constituencyId: input.constituencyId,
              sequenceNo: (latest?.sequenceNo ?? 0) + 1
            }
          });
        });

        return {
          queueId: created.id,
          sequenceNo: created.sequenceNo
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const current = await prisma.kycQueueItem.findUnique({
            where: { submissionId: input.submissionId }
          });

          if (current) {
            return {
              queueId: current.id,
              sequenceNo: current.sequenceNo
            };
          }

          continue;
        }

        throw error;
      }
    }

    throw new Error("Unable to enqueue KYC submission after retries");
  }
};
