import { createHash, randomBytes, randomUUID } from "node:crypto";

import { type Address, getAddress, isAddress } from "viem";

import { APP_CONSTANTS } from "../config/constants.js";
import { appError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { redis } from "../db/redis.js";

interface IssueChallengeInput {
  wallet: string;
  chainId: number;
  domain: string;
  uri: string;
  sourceIp: string;
}

export interface AuthChallenge {
  challengeId: string;
  wallet: string;
  chainId: number;
  nonce: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
}

interface ChallengeRecord extends AuthChallenge {
  walletDigest: string;
}

interface LockStatus {
  attempts: number;
  ttlSec: number;
}

function challengeKey(challengeId: string): string {
  return `auth:challenge:${challengeId}`;
}

function lockKey(wallet: string, sourceIp: string): string {
  return `auth:verify-lock:${wallet.toLowerCase()}:${sourceIp}`;
}

function normalizeWallet(wallet: string): Address {
  const trimmed = wallet.trim();
  if (!isAddress(trimmed)) {
    throw appError.validation("Invalid wallet address");
  }

  return getAddress(trimmed);
}

function walletDigest(wallet: string): string {
  return createHash("sha256").update(wallet.toLowerCase()).digest("hex");
}

function buildChallengeMessage(input: {
  domain: string;
  wallet: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}): string {
  return `${input.domain} wants you to sign in with your Ethereum account:\n${input.wallet}\n\nSign in to DVote backend.\n\nURI: ${input.uri}\nVersion: 1\nChain ID: ${input.chainId}\nNonce: ${input.nonce}\nIssued At: ${input.issuedAt}`;
}

async function readLockStatus(wallet: string, sourceIp: string): Promise<LockStatus> {
  const key = lockKey(wallet, sourceIp);
  const attempts = Number((await redis.get<number>(key)) ?? 0);
  const ttl = Number((await redis.ttl(key)) ?? -2);
  return {
    attempts: Number.isFinite(attempts) ? attempts : 0,
    ttlSec: Number.isFinite(ttl) ? ttl : -2
  };
}

function parseChallenge(raw: string): ChallengeRecord | null {
  try {
    const parsed = JSON.parse(raw) as ChallengeRecord;
    if (
      typeof parsed.challengeId !== "string" ||
      typeof parsed.wallet !== "string" ||
      typeof parsed.chainId !== "number" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.message !== "string" ||
      typeof parsed.issuedAt !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      typeof parsed.walletDigest !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export const challengeService = {
  async issueChallenge(input: IssueChallengeInput): Promise<AuthChallenge> {
    const wallet = normalizeWallet(input.wallet);

    let lock: LockStatus;
    try {
      lock = await readLockStatus(wallet, input.sourceIp);
    } catch {
      throw appError.serviceUnavailable("Authentication challenge service unavailable");
    }

    if (lock.attempts >= APP_CONSTANTS.authLockMaxAttempts) {
      const waitSec = Math.max(lock.ttlSec, 0);
      throw appError.rateLimited(`Too many failed attempts. Retry after ${waitSec} seconds`);
    }

    const challengeId = randomUUID();
    const nonce = randomBytes(16).toString("hex");
    const issuedAtDate = new Date();
    const expiresAtDate = new Date(issuedAtDate.getTime() + APP_CONSTANTS.authChallengeTtlSec * 1000);

    const issuedAt = issuedAtDate.toISOString();
    const expiresAt = expiresAtDate.toISOString();

    const message = buildChallengeMessage({
      domain: input.domain,
      wallet,
      uri: input.uri,
      chainId: input.chainId,
      nonce,
      issuedAt
    });

    const record: ChallengeRecord = {
      challengeId,
      wallet,
      chainId: input.chainId,
      nonce,
      message,
      issuedAt,
      expiresAt,
      walletDigest: walletDigest(wallet)
    };

    try {
      await redis.set(challengeKey(challengeId), JSON.stringify(record), { ex: APP_CONSTANTS.authChallengeTtlSec });
    } catch {
      throw appError.serviceUnavailable("Authentication challenge service unavailable");
    }

    return {
      challengeId: record.challengeId,
      wallet: record.wallet,
      chainId: record.chainId,
      nonce: record.nonce,
      message: record.message,
      issuedAt: record.issuedAt,
      expiresAt: record.expiresAt
    };
  },

  async loadChallenge(challengeId: string): Promise<AuthChallenge | null> {
    try {
      const raw = await redis.get<string>(challengeKey(challengeId));
      if (!raw) {
        return null;
      }

      const parsed = parseChallenge(raw);
      if (!parsed) {
        return null;
      }

      return {
        challengeId: parsed.challengeId,
        wallet: parsed.wallet,
        chainId: parsed.chainId,
        nonce: parsed.nonce,
        message: parsed.message,
        issuedAt: parsed.issuedAt,
        expiresAt: parsed.expiresAt
      };
    } catch {
      throw appError.serviceUnavailable("Authentication challenge service unavailable");
    }
  },

  async invalidateChallenge(challengeId: string): Promise<void> {
    try {
      await redis.del(challengeKey(challengeId));
    } catch {
      throw appError.serviceUnavailable("Authentication challenge service unavailable");
    }
  },

  async registerFailedAttempt(wallet: string, sourceIp: string): Promise<void> {
    const normalizedWallet = normalizeWallet(wallet);
    const key = lockKey(normalizedWallet, sourceIp);

    try {
      const failures = await redis.incr(key);
      if (failures === 1) {
        await redis.expire(key, APP_CONSTANTS.authLockWindowSec);
      }

      if (failures >= APP_CONSTANTS.authLockMaxAttempts) {
        logger.warn("Auth verify lock engaged", {
          walletDigest: walletDigest(normalizedWallet),
          sourceIp,
          failures
        });
      }
    } catch {
      throw appError.serviceUnavailable("Authentication challenge service unavailable");
    }
  },

  async clearFailedAttempts(wallet: string, sourceIp: string): Promise<void> {
    const normalizedWallet = normalizeWallet(wallet);

    try {
      await redis.del(lockKey(normalizedWallet, sourceIp));
    } catch {
      throw appError.serviceUnavailable("Authentication challenge service unavailable");
    }
  }
};
