import { createHash } from "node:crypto";

import { VoteRelayState } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";

const clientNonceSchema = z.uuidv7();

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildDedupeKey(input: { wallet: string; electionId: string; clientNonce: string }): string {
  return `${input.wallet.toLowerCase()}:${input.electionId}:${input.clientNonce}`;
}

export const idempotencyService = {
  validateClientNonce(clientNonce: string): void {
    const parsed = clientNonceSchema.safeParse(clientNonce);
    if (!parsed.success) {
      throw appError.clientNonceInvalidFormat();
    }
  },

  async createOrReuseIntent(input: {
    wallet: string;
    electionId: string;
    clientNonce: string;
    payload: unknown;
  }): Promise<{
    voteIntentId: string;
    relayState: VoteRelayState;
    wasExisting: boolean;
  }> {
    this.validateClientNonce(input.clientNonce);

    const dedupeKey = buildDedupeKey({
      wallet: input.wallet,
      electionId: input.electionId,
      clientNonce: input.clientNonce
    });

    const payloadHash = hashPayload(input.payload);

    const existing = await prisma.voteIntent.findUnique({
      where: {
        dedupeKey
      }
    });

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw appError.conflict("Dedupe key already exists with different payload");
      }

      return {
        voteIntentId: existing.id,
        relayState: existing.relayState,
        wasExisting: true
      };
    }

    const created = await prisma.voteIntent.create({
      data: {
        dedupeKey,
        wallet: input.wallet,
        electionId: input.electionId,
        clientNonce: input.clientNonce,
        payloadHash,
        relayState: VoteRelayState.VALIDATED
      }
    });

    return {
      voteIntentId: created.id,
      relayState: created.relayState,
      wasExisting: false
    };
  }
};
