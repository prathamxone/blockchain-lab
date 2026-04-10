import { type Response, Router } from "express";
import { type Address, getAddress, isAddress, verifyMessage } from "viem";
import { z } from "zod";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { appError } from "../lib/errors.js";
import { sendSuccess } from "../lib/http.js";
import { requireOwnerRole } from "../roles/roles.middleware.js";
import { sessionService } from "../sessions/session.service.js";
import { requireAuth } from "./auth.middleware.js";
import { challengeService } from "./challenge.service.js";
import { csrfProtect } from "./csrf.middleware.js";
import { tokenService } from "./token.service.js";

const challengeSchema = z.object({
  wallet: z.string().min(1),
  chainId: z.number().int().positive()
});

const verifySchema = z.object({
  wallet: z.string().min(1),
  chainId: z.number().int().positive(),
  challengeId: z.string().uuid(),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/)
});

function resolveWallet(wallet: string): string {
  if (!isAddress(wallet)) {
    throw appError.validation("Invalid wallet address");
  }

  return getAddress(wallet);
}

function resolveChallengeUri(): string {
  return env.FRONTEND_ORIGINS[0] ?? "http://localhost:5173";
}

function setAuthCookies(res: Response, refreshToken: string, csrfToken: string): void {
  res.cookie(tokenService.refreshCookieName(), refreshToken, tokenService.refreshCookieOptions());
  res.cookie(tokenService.csrfCookieName(), csrfToken, tokenService.csrfCookieOptions());
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(tokenService.refreshCookieName(), tokenService.clearRefreshCookieOptions());
  res.clearCookie(tokenService.csrfCookieName(), tokenService.clearCsrfCookieOptions());
}

export const authRouter = Router();

authRouter.post("/auth/challenge", async (req, res) => {
  const body = challengeSchema.parse(req.body);
  const normalizedWallet = resolveWallet(body.wallet);

  const challenge = await challengeService.issueChallenge({
    wallet: normalizedWallet,
    chainId: body.chainId,
    domain: req.hostname,
    uri: resolveChallengeUri(),
    sourceIp: req.ip ?? "unknown"
  });

  sendSuccess(res, 200, {
    challengeId: challenge.challengeId,
    message: challenge.message,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    expiresAt: challenge.expiresAt
  });
});

authRouter.post("/auth/verify", async (req, res) => {
  const body = verifySchema.parse(req.body);
  const sourceIp = req.ip ?? "unknown";

  const normalizedWallet = resolveWallet(body.wallet);
  const challenge = await challengeService.loadChallenge(body.challengeId);

  if (!challenge) {
    throw appError.unauthorized("Challenge expired or not found");
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    await challengeService.invalidateChallenge(challenge.challengeId);
    throw appError.unauthorized("Challenge expired");
  }

  if (challenge.wallet.toLowerCase() !== normalizedWallet.toLowerCase() || challenge.chainId !== body.chainId) {
    await challengeService.registerFailedAttempt(normalizedWallet, sourceIp);
    throw appError.unauthorized("Challenge payload mismatch");
  }

  const signatureValid = await verifyMessage({
    address: challenge.wallet as Address,
    message: challenge.message,
    signature: body.signature as `0x${string}`
  });

  if (!signatureValid) {
    await challengeService.registerFailedAttempt(normalizedWallet, sourceIp);
    throw appError.unauthorized("Invalid wallet signature");
  }

  await challengeService.clearFailedAttempts(normalizedWallet, sourceIp);
  await challengeService.invalidateChallenge(challenge.challengeId);

  const roleWallet = await prisma.roleWallet.findUnique({
    where: { wallet: normalizedWallet }
  });

  const role = roleWallet?.active ? roleWallet.role : "VOTER";
  const refreshFamilyId = tokenService.createRefreshFamilyId();
  const refreshTokenId = tokenService.createRefreshTokenId();

  const session = await sessionService.createSession({
    wallet: normalizedWallet,
    role,
    refreshFamilyId,
    refreshTokenId
  });

  const tokenPair = await tokenService.issueTokenPair({
    wallet: normalizedWallet,
    role,
    sessionId: session.sessionId,
    refreshFamilyId,
    refreshTokenId
  });

  const csrfToken = tokenService.createCsrfToken();
  setAuthCookies(res, tokenPair.refreshToken, csrfToken);

  sendSuccess(res, 200, {
    accessToken: tokenPair.accessToken,
    csrfToken,
    user: {
      wallet: normalizedWallet,
      role
    },
    session: {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt
    }
  });
});

authRouter.post("/auth/refresh", csrfProtect, async (req, res) => {
  const refreshToken = req.cookies?.[tokenService.refreshCookieName()] as string | undefined;
  if (!refreshToken) {
    throw appError.unauthorized("Missing refresh token");
  }

  const claims = await tokenService.verifyRefreshToken(refreshToken);
  const nextRefreshTokenId = tokenService.createRefreshTokenId();

  const rotateResult = await sessionService.rotateRefresh({
    sessionId: claims.sessionId,
    wallet: claims.wallet,
    refreshFamilyId: claims.refreshFamilyId,
    presentedRefreshTokenId: claims.refreshTokenId,
    newRefreshTokenId: nextRefreshTokenId
  });

  if (rotateResult.status === "revoked-replay") {
    clearAuthCookies(res);
    throw appError.unauthorized("Refresh token replay detected. Session revoked");
  }

  const tokenPair = await tokenService.issueTokenPair({
    wallet: claims.wallet,
    role: rotateResult.session.role,
    sessionId: rotateResult.session.sessionId,
    refreshFamilyId: rotateResult.session.refreshFamilyId,
    refreshTokenId: nextRefreshTokenId
  });

  const csrfToken = tokenService.createCsrfToken();
  setAuthCookies(res, tokenPair.refreshToken, csrfToken);

  sendSuccess(res, 200, {
    accessToken: tokenPair.accessToken,
    csrfToken,
    session: {
      sessionId: rotateResult.session.sessionId,
      expiresAt: rotateResult.session.expiresAt
    }
  });
});

authRouter.post("/auth/logout", csrfProtect, async (req, res) => {
  const refreshToken = req.cookies?.[tokenService.refreshCookieName()] as string | undefined;

  if (refreshToken) {
    try {
      const claims = await tokenService.verifyRefreshToken(refreshToken);
      await sessionService.revokeSession(claims.sessionId);
    } catch {
      // Token may already be expired or malformed; cookie clear still proceeds.
    }
  }

  clearAuthCookies(res);
  sendSuccess(res, 200, { loggedOut: true });
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const session = await sessionService.getSession(req.auth!.sessionId);

  sendSuccess(res, 200, {
    wallet: req.auth!.wallet,
    role: req.auth!.role,
    sessionId: req.auth!.sessionId,
    sessionExpiresAt: session?.expiresAt ?? null
  });
});

authRouter.get("/owner/ping", requireAuth, requireOwnerRole, (_req, res) => {
  sendSuccess(res, 200, {
    ok: true,
    message: "Owner role access granted"
  });
});
