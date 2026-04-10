import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMocks = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn()
}));

vi.mock("../../src/db/redis.js", () => ({
  redis: {
    incr: redisMocks.incr,
    expire: redisMocks.expire,
    ttl: redisMocks.ttl
  },
  probeRedis: vi.fn()
}));

import { csrfProtect } from "../../src/auth/csrf.middleware.js";
import { tokenService } from "../../src/auth/token.service.js";
import { corsMiddleware } from "../../src/config/cors.js";
import { requestIdMiddleware } from "../../src/lib/request-id.js";
import { appErrorHandler } from "../../src/middleware/error-handler.js";
import { globalApiIpRateLimit, voteWalletRateLimit } from "../../src/middleware/rate-limit.js";

describe("security controls", () => {
  beforeEach(() => {
    redisMocks.incr.mockReset();
    redisMocks.expire.mockReset();
    redisMocks.ttl.mockReset();
  });

  it("blocks invalid CSRF token pairs on mutating routes", async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.use(cookieParser());
    app.post("/mutate", csrfProtect, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(appErrorHandler);

    const response = await request(app)
      .post("/mutate")
      .set("x-csrf-token", "header-token")
      .set("Cookie", `${tokenService.csrfCookieName()}=cookie-token`)
      .expect(403);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects unknown CORS origins with deterministic 403", async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.use(corsMiddleware);
    app.get("/resource", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(appErrorHandler);

    const response = await request(app)
      .get("/resource")
      .set("Origin", "https://evil.example")
      .expect(403);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("enforces global API IP rate limits", async () => {
    redisMocks.incr.mockResolvedValue(61);
    redisMocks.ttl.mockResolvedValue(42);

    const app = express();
    app.use(requestIdMiddleware);
    app.get("/limited", globalApiIpRateLimit, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(appErrorHandler);

    const response = await request(app).get("/limited").expect(429);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("RATE_LIMITED");
    expect(response.body.error.message).toContain("Retry after 42 seconds");
  });

  it("enforces vote wallet route limits", async () => {
    redisMocks.incr.mockResolvedValue(4);
    redisMocks.ttl.mockResolvedValue(15);

    const app = express();
    app.use(requestIdMiddleware);
    app.use((req, _res, next) => {
      req.auth = {
        wallet: "0x0000000000000000000000000000000000000001",
        role: "VOTER",
        sessionId: "session-test"
      };
      next();
    });
    app.post("/vote", voteWalletRateLimit, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(appErrorHandler);

    const response = await request(app).post("/vote").expect(429);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("RATE_LIMITED");
  });
});
