import { createHash } from "node:crypto";

import { VoteRelayState } from "@prisma/client";

import { APP_CONSTANTS } from "../config/constants.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";
import { auditService } from "../audit/audit.service.js";
import { idempotencyService } from "./idempotency.service.js";
import { voteTokenService } from "./vote-token.service.js";

interface CastVoteInput {
  wallet: string;
  electionId: string;
  clientNonce: string;
  voteToken: string;
  payload: {
    candidateId: string;
  };
}

interface LookupInput {
  voteIntentId?: string | undefined;
  wallet?: string | undefined;
  electionId?: string | undefined;
  clientNonce?: string | undefined;
}

function deterministicRelayState(clientNonce: string): VoteRelayState {
  const digest = createHash("sha256").update(clientNonce).digest("hex");
  const marker = Number.parseInt(digest.slice(0, 2), 16) % 10;

  if (marker === 0) {
    return VoteRelayState.TIMEOUT_UNCERTAIN;
  }

  if (marker === 1) {
    return VoteRelayState.FAILED;
  }

  if (marker === 2) {
    return VoteRelayState.CONFLICT;
  }

  return VoteRelayState.CONFIRMED;
}

function isTerminalState(state: VoteRelayState): boolean {
  return (
    state === VoteRelayState.CONFIRMED ||
    state === VoteRelayState.FAILED ||
    state === VoteRelayState.EXPIRED ||
    state === VoteRelayState.CONFLICT
  );
}

function toContractState(state: VoteRelayState): string {
  if (state === VoteRelayState.TIMEOUT_UNCERTAIN) {
    return "timeout-uncertain";
  }

  if (state === VoteRelayState.SUBMITTED_TO_CHAIN) {
    return "submitted";
  }

  return state.toLowerCase().replace(/_/g, "-");
}

async function resolveVoteIntent(input: LookupInput) {
  if (input.voteIntentId) {
    return prisma.voteIntent.findUnique({
      where: {
        id: input.voteIntentId
      }
    });
  }

  if (!input.wallet || !input.electionId || !input.clientNonce) {
    throw appError.validation("voteIntentId or wallet+electionId+clientNonce is required");
  }

  idempotencyService.validateClientNonce(input.clientNonce);

  const dedupeKey = `${input.wallet.toLowerCase()}:${input.electionId}:${input.clientNonce}`;
  return prisma.voteIntent.findUnique({
    where: {
      dedupeKey
    }
  });
}

export const voteRelayService = {
  async cast(input: CastVoteInput): Promise<{
    voteIntentId: string;
    relayState: string;
    terminal: boolean;
    recheckAfterSec?: number;
    statusLookupWindowSec?: number;
  }> {
    await voteTokenService.consume({
      voteToken: input.voteToken,
      wallet: input.wallet,
      electionId: input.electionId
    });

    const intent = await idempotencyService.createOrReuseIntent({
      wallet: input.wallet,
      electionId: input.electionId,
      clientNonce: input.clientNonce,
      payload: input.payload
    });

    if (intent.wasExisting && isTerminalState(intent.relayState)) {
      return {
        voteIntentId: intent.voteIntentId,
        relayState: toContractState(intent.relayState),
        terminal: true
      };
    }

    const nextRelayState = deterministicRelayState(input.clientNonce);

    await prisma.voteIntent.update({
      where: {
        id: intent.voteIntentId
      },
      data: {
        relayState: nextRelayState
      }
    });

    const txHash = nextRelayState === VoteRelayState.CONFIRMED
      ? createHash("sha256").update(`${intent.voteIntentId}:${Date.now()}`).digest("hex")
      : null;

    const voteRelay = await prisma.voteRelay.upsert({
      where: {
        voteIntentId: intent.voteIntentId
      },
      create: {
        voteIntentId: intent.voteIntentId,
        relayState: nextRelayState,
        txHash,
        failureCode: nextRelayState === VoteRelayState.FAILED ? "RELAY_STUB_FAILED" : null
      },
      update: {
        relayState: nextRelayState,
        txHash,
        failureCode: nextRelayState === VoteRelayState.FAILED ? "RELAY_STUB_FAILED" : null
      }
    });

    await auditService.write({
      actorWallet: input.wallet,
      action: "VOTE_CAST_STUB_RELAY",
      entityType: "VoteIntent",
      entityId: intent.voteIntentId,
      payload: {
        electionId: input.electionId,
        clientNonce: input.clientNonce,
        relayState: nextRelayState,
        voteRelayId: voteRelay.id
      }
    });

    if (nextRelayState === VoteRelayState.TIMEOUT_UNCERTAIN) {
      return {
        voteIntentId: intent.voteIntentId,
        relayState: toContractState(nextRelayState),
        terminal: false,
        recheckAfterSec: APP_CONSTANTS.voteStatusRecheckAfterSec,
        statusLookupWindowSec: env.VOTE_TIMEOUT_LOOKUP_WINDOW_SEC
      };
    }

    return {
      voteIntentId: intent.voteIntentId,
      relayState: toContractState(nextRelayState),
      terminal: isTerminalState(nextRelayState)
    };
  },

  async lookupStatus(input: LookupInput): Promise<{
    voteIntentId: string;
    relayState: string;
    terminal: boolean;
    txHash: string | null;
    failureCode: string | null;
    recheckAfterSec?: number;
    statusLookupWindowSec?: number;
  }> {
    const intent = await resolveVoteIntent(input);
    if (!intent) {
      throw appError.notFound("Vote intent not found");
    }

    let relayState = intent.relayState;

    if (relayState === VoteRelayState.TIMEOUT_UNCERTAIN) {
      const ageSec = Math.floor((Date.now() - intent.createdAt.getTime()) / 1000);
      if (ageSec > env.VOTE_TIMEOUT_LOOKUP_WINDOW_SEC) {
        relayState = VoteRelayState.EXPIRED;

        await prisma.voteIntent.update({
          where: {
            id: intent.id
          },
          data: {
            relayState: VoteRelayState.EXPIRED
          }
        });

        await prisma.voteRelay.upsert({
          where: {
            voteIntentId: intent.id
          },
          create: {
            voteIntentId: intent.id,
            relayState: VoteRelayState.EXPIRED,
            failureCode: "LOOKUP_WINDOW_EXPIRED"
          },
          update: {
            relayState: VoteRelayState.EXPIRED,
            failureCode: "LOOKUP_WINDOW_EXPIRED"
          }
        });
      }
    }

    const relay = await prisma.voteRelay.findUnique({
      where: {
        voteIntentId: intent.id
      }
    });

    if (relayState === VoteRelayState.TIMEOUT_UNCERTAIN) {
      return {
        voteIntentId: intent.id,
        relayState: toContractState(relayState),
        terminal: false,
        txHash: relay?.txHash ?? null,
        failureCode: relay?.failureCode ?? null,
        recheckAfterSec: APP_CONSTANTS.voteStatusRecheckAfterSec,
        statusLookupWindowSec: env.VOTE_TIMEOUT_LOOKUP_WINDOW_SEC
      };
    }

    return {
      voteIntentId: intent.id,
      relayState: toContractState(relayState),
      terminal: isTerminalState(relayState),
      txHash: relay?.txHash ?? null,
      failureCode: relay?.failureCode ?? null
    };
  }
};
