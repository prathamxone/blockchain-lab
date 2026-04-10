import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { redis } from "../db/redis.js";
import { appError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

interface SessionStateJson {
  [key: string]: unknown;
  role: string;
  currentRefreshTokenId: string;
  revoked: boolean;
}

export interface SessionSnapshot {
  sessionId: string;
  wallet: string;
  role: string;
  refreshFamilyId: string;
  currentRefreshTokenId: string;
  lastActivityAt: string;
  expiresAt: string;
  revoked: boolean;
}

interface SessionFetch {
  session: SessionSnapshot | null;
  redisAvailable: boolean;
}

interface CreateSessionInput {
  wallet: string;
  role: string;
  refreshFamilyId: string;
  refreshTokenId: string;
}

interface RotateRefreshInput {
  sessionId: string;
  wallet: string;
  refreshFamilyId: string;
  presentedRefreshTokenId: string;
  newRefreshTokenId: string;
}

interface RotateRefreshResult {
  status: "rotated" | "revoked-replay";
  session: SessionSnapshot;
}

function sessionKey(sessionId: string): string {
  return `auth:session:${sessionId}`;
}

function isExpired(isoTs: string): boolean {
  return new Date(isoTs).getTime() <= Date.now();
}

function nextInactivityExpiryIso(): string {
  return new Date(Date.now() + env.SESSION_IDLE_TIMEOUT_SEC * 1000).toISOString();
}

function parseSession(raw: string): SessionSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as SessionSnapshot;

    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.wallet !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.refreshFamilyId !== "string" ||
      typeof parsed.currentRefreshTokenId !== "string" ||
      typeof parsed.lastActivityAt !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      typeof parsed.revoked !== "boolean"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildSessionStateJson(session: SessionSnapshot): SessionStateJson {
  return {
    role: session.role,
    currentRefreshTokenId: session.currentRefreshTokenId,
    revoked: session.revoked
  };
}

function toInputJsonValue(session: SessionSnapshot): Prisma.InputJsonValue {
  return buildSessionStateJson(session) as Prisma.InputJsonValue;
}

async function readRedisSession(sessionId: string): Promise<SessionSnapshot | null> {
  const raw = await redis.get<string>(sessionKey(sessionId));
  if (!raw) {
    return null;
  }

  return parseSession(raw);
}

async function writeRedisSession(session: SessionSnapshot): Promise<void> {
  await redis.set(sessionKey(session.sessionId), JSON.stringify(session), { ex: env.JWT_REFRESH_TTL_SEC });
}

async function readTursoSession(sessionId: string): Promise<SessionSnapshot | null> {
  const row = await prisma.sessionState.findUnique({
    where: { sessionId }
  });

  if (!row) {
    return null;
  }

  const state = (row.resumableState ?? {}) as Record<string, unknown>;
  const role = typeof state.role === "string" && state.role.length > 0 ? state.role : "VOTER";
  const currentRefreshTokenId =
    typeof state.currentRefreshTokenId === "string" && state.currentRefreshTokenId.length > 0
      ? state.currentRefreshTokenId
      : "";
  const revoked = Boolean(state.revoked);

  return {
    sessionId: row.sessionId,
    wallet: row.wallet,
    role,
    refreshFamilyId: row.refreshFamilyId,
    currentRefreshTokenId,
    lastActivityAt: row.lastActivityAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revoked
  };
}

async function writeTursoSession(session: SessionSnapshot): Promise<void> {
  await prisma.sessionState.upsert({
    where: { sessionId: session.sessionId },
    update: {
      wallet: session.wallet,
      refreshFamilyId: session.refreshFamilyId,
      lastActivityAt: new Date(session.lastActivityAt),
      expiresAt: new Date(session.expiresAt),
      resumableState: toInputJsonValue(session)
    },
    create: {
      sessionId: session.sessionId,
      wallet: session.wallet,
      refreshFamilyId: session.refreshFamilyId,
      lastActivityAt: new Date(session.lastActivityAt),
      expiresAt: new Date(session.expiresAt),
      resumableState: toInputJsonValue(session)
    }
  });
}

async function fetchSession(sessionId: string): Promise<SessionFetch> {
  try {
    const redisSession = await readRedisSession(sessionId);
    if (redisSession) {
      return { session: redisSession, redisAvailable: true };
    }

    const tursoSession = await readTursoSession(sessionId);
    return { session: tursoSession, redisAvailable: true };
  } catch {
    const tursoSession = await readTursoSession(sessionId);
    return { session: tursoSession, redisAvailable: false };
  }
}

async function persistSession(session: SessionSnapshot, redisAvailable: boolean): Promise<void> {
  if (redisAvailable) {
    try {
      await writeRedisSession(session);
    } catch {
      logger.warn("Redis write failed, persisting session in fallback store", { sessionId: session.sessionId });
    }
  }

  await writeTursoSession(session);
}

export const sessionService = {
  async createSession(input: CreateSessionInput): Promise<SessionSnapshot> {
    const nowIso = new Date().toISOString();
    const session: SessionSnapshot = {
      sessionId: randomUUID(),
      wallet: input.wallet,
      role: input.role,
      refreshFamilyId: input.refreshFamilyId,
      currentRefreshTokenId: input.refreshTokenId,
      lastActivityAt: nowIso,
      expiresAt: nextInactivityExpiryIso(),
      revoked: false
    };

    try {
      await writeRedisSession(session);
    } catch {
      throw appError.serviceUnavailable("Redis unavailable. Existing sessions only");
    }

    await writeTursoSession(session);
    return session;
  },

  async getSession(sessionId: string): Promise<SessionSnapshot | null> {
    const { session } = await fetchSession(sessionId);
    return session;
  },

  async assertActiveSession(sessionId: string, wallet: string): Promise<SessionSnapshot> {
    const fetched = await fetchSession(sessionId);
    const session = fetched.session;

    if (!session) {
      throw appError.unauthorized("Session not found");
    }

    if (session.wallet.toLowerCase() !== wallet.toLowerCase()) {
      throw appError.unauthorized("Session wallet mismatch");
    }

    if (session.revoked) {
      throw appError.unauthorized("Session revoked");
    }

    if (isExpired(session.expiresAt)) {
      throw appError.unauthorized("Session expired due to inactivity");
    }

    return session;
  },

  async touchSession(sessionId: string): Promise<void> {
    const fetched = await fetchSession(sessionId);
    if (!fetched.session) {
      return;
    }

    const updated: SessionSnapshot = {
      ...fetched.session,
      lastActivityAt: new Date().toISOString(),
      expiresAt: nextInactivityExpiryIso()
    };

    await persistSession(updated, fetched.redisAvailable);
  },

  async rotateRefresh(input: RotateRefreshInput): Promise<RotateRefreshResult> {
    const fetched = await fetchSession(input.sessionId);
    const session = fetched.session;

    if (!session) {
      throw appError.unauthorized("Session not found");
    }

    if (session.wallet.toLowerCase() !== input.wallet.toLowerCase()) {
      throw appError.unauthorized("Session wallet mismatch");
    }

    if (session.refreshFamilyId !== input.refreshFamilyId) {
      throw appError.unauthorized("Refresh family mismatch");
    }

    if (session.revoked || isExpired(session.expiresAt)) {
      throw appError.unauthorized("Session expired or revoked");
    }

    const nowIso = new Date().toISOString();
    if (session.currentRefreshTokenId !== input.presentedRefreshTokenId) {
      const replayRevoked: SessionSnapshot = {
        ...session,
        revoked: true,
        lastActivityAt: nowIso,
        expiresAt: nextInactivityExpiryIso()
      };

      await persistSession(replayRevoked, fetched.redisAvailable);
      return { status: "revoked-replay", session: replayRevoked };
    }

    const rotated: SessionSnapshot = {
      ...session,
      currentRefreshTokenId: input.newRefreshTokenId,
      lastActivityAt: nowIso,
      expiresAt: nextInactivityExpiryIso()
    };

    await persistSession(rotated, fetched.redisAvailable);
    return { status: "rotated", session: rotated };
  },

  async revokeSession(sessionId: string): Promise<void> {
    const fetched = await fetchSession(sessionId);
    if (!fetched.session) {
      return;
    }

    const revoked: SessionSnapshot = {
      ...fetched.session,
      revoked: true,
      lastActivityAt: new Date().toISOString(),
      expiresAt: nextInactivityExpiryIso()
    };

    await writeTursoSession(revoked);

    try {
      await redis.del(sessionKey(sessionId));
    } catch {
      logger.warn("Redis revoke delete failed", { sessionId });
    }
  }
};
