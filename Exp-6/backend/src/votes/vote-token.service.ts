import { createHash, randomBytes } from "node:crypto";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";

function hashVoteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateVoteTokenValue(): string {
  return randomBytes(32).toString("base64url");
}

export const voteTokenService = {
  async issue(input: { wallet: string; electionId: string }): Promise<{
    voteToken: string;
    expiresAt: string;
    ttlSec: number;
  }> {
    const voteToken = generateVoteTokenValue();
    const tokenHash = hashVoteToken(voteToken);
    const expiresAt = new Date(Date.now() + env.VOTE_TOKEN_TTL_SEC * 1000);

    await prisma.voteToken.create({
      data: {
        tokenHash,
        wallet: input.wallet,
        electionId: input.electionId,
        expiresAt
      }
    });

    return {
      voteToken,
      expiresAt: expiresAt.toISOString(),
      ttlSec: env.VOTE_TOKEN_TTL_SEC
    };
  },

  async consume(input: {
    voteToken: string;
    wallet: string;
    electionId: string;
  }): Promise<void> {
    const tokenHash = hashVoteToken(input.voteToken);

    const record = await prisma.voteToken.findUnique({
      where: {
        tokenHash
      }
    });

    if (!record) {
      throw appError.unprocessable("Vote token is invalid");
    }

    if (record.wallet.toLowerCase() !== input.wallet.toLowerCase() || record.electionId !== input.electionId) {
      throw appError.unprocessable("Vote token scope mismatch");
    }

    if (record.consumedAt) {
      throw appError.conflict("Vote token already consumed");
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw appError.unprocessable("Vote token expired. Request a new token");
    }

    await prisma.voteToken.update({
      where: {
        tokenHash
      },
      data: {
        consumedAt: new Date()
      }
    });
  }
};
