import { randomBytes, randomUUID } from "node:crypto";

import { type CookieOptions } from "express";
import { SignJWT, jwtVerify } from "jose";

import { APP_CONSTANTS } from "../config/constants.js";
import { env } from "../config/env.js";
import { appError } from "../lib/errors.js";

const ISSUER = "dvote-backend";
const ACCESS_AUDIENCE = "dvote-backend:access";
const REFRESH_AUDIENCE = "dvote-backend:refresh";
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface TokenSubject {
  wallet: string;
  role: string;
  sessionId: string;
}

export interface RefreshTokenClaims extends TokenSubject {
  refreshFamilyId: string;
  refreshTokenId: string;
}

interface BaseClaims {
  [key: string]: unknown;
  role: string;
  sid: string;
  typ: "access" | "refresh";
}

function parseClaim(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw appError.unauthorized(`Invalid token claim: ${label}`);
  }

  return value;
}

function parseTokenSubject(payload: Record<string, unknown>): TokenSubject {
  return {
    wallet: parseClaim(payload.sub, "sub"),
    role: parseClaim(payload.role, "role"),
    sessionId: parseClaim(payload.sid, "sid")
  };
}

function baseCookieOptions(): CookieOptions {
  return {
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };
}

export const tokenService = {
  createRefreshFamilyId(): string {
    return randomUUID();
  },

  createRefreshTokenId(): string {
    return randomUUID();
  },

  createCsrfToken(): string {
    return randomBytes(24).toString("hex");
  },

  async issueAccessToken(subject: TokenSubject): Promise<string> {
    const claims: BaseClaims = {
      role: subject.role,
      sid: subject.sessionId,
      typ: "access"
    };

    return new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(ISSUER)
      .setAudience(ACCESS_AUDIENCE)
      .setSubject(subject.wallet)
      .setIssuedAt()
      .setExpirationTime(`${env.JWT_ACCESS_TTL_SEC}s`)
      .sign(accessSecret);
  },

  async issueRefreshToken(subject: RefreshTokenClaims): Promise<string> {
    const claims: BaseClaims & { fid: string; jti: string } = {
      role: subject.role,
      sid: subject.sessionId,
      fid: subject.refreshFamilyId,
      jti: subject.refreshTokenId,
      typ: "refresh"
    };

    return new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(ISSUER)
      .setAudience(REFRESH_AUDIENCE)
      .setSubject(subject.wallet)
      .setIssuedAt()
      .setExpirationTime(`${env.JWT_REFRESH_TTL_SEC}s`)
      .sign(refreshSecret);
  },

  async issueTokenPair(subject: RefreshTokenClaims): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(subject),
      this.issueRefreshToken(subject)
    ]);

    return { accessToken, refreshToken };
  },

  async verifyAccessToken(token: string): Promise<TokenSubject> {
    try {
      const { payload } = await jwtVerify(token, accessSecret, {
        issuer: ISSUER,
        audience: ACCESS_AUDIENCE
      });

      const claims = payload as Record<string, unknown>;
      if (claims.typ !== "access") {
        throw appError.unauthorized("Invalid token type");
      }

      return parseTokenSubject(claims);
    } catch {
      throw appError.unauthorized("Invalid or expired access token");
    }
  },

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, refreshSecret, {
        issuer: ISSUER,
        audience: REFRESH_AUDIENCE
      });

      const claims = payload as Record<string, unknown>;
      if (claims.typ !== "refresh") {
        throw appError.unauthorized("Invalid token type");
      }

      const subject = parseTokenSubject(claims);

      return {
        ...subject,
        refreshFamilyId: parseClaim(claims.fid, "fid"),
        refreshTokenId: parseClaim(claims.jti, "jti")
      };
    } catch {
      throw appError.unauthorized("Invalid or expired refresh token");
    }
  },

  refreshCookieOptions(): CookieOptions {
    return {
      ...baseCookieOptions(),
      httpOnly: true,
      maxAge: env.JWT_REFRESH_TTL_SEC * 1000
    };
  },

  clearRefreshCookieOptions(): CookieOptions {
    return {
      ...baseCookieOptions(),
      httpOnly: true,
      maxAge: 0
    };
  },

  csrfCookieOptions(): CookieOptions {
    return {
      ...baseCookieOptions(),
      httpOnly: false,
      maxAge: env.SESSION_IDLE_TIMEOUT_SEC * 1000
    };
  },

  clearCsrfCookieOptions(): CookieOptions {
    return {
      ...baseCookieOptions(),
      httpOnly: false,
      maxAge: 0
    };
  },

  refreshCookieName(): string {
    return APP_CONSTANTS.refreshCookieName;
  },

  csrfCookieName(): string {
    return APP_CONSTANTS.csrfCookieName;
  }
};
