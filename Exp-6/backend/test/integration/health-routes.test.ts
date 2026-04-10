import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  probePrisma: vi.fn<() => Promise<boolean>>(),
  probeRedis: vi.fn<() => Promise<boolean>>(),
  probeR2: vi.fn<() => Promise<boolean>>(),
  roleWalletCount: vi.fn<() => Promise<number>>(),
  electionMirrorFindFirst: vi.fn<() => Promise<{ lastSyncedAt: Date } | null>>()
}));

vi.mock("../../src/auth/auth.middleware.js", () => ({
  requireAuth: (req: { auth?: { wallet: string; role: string; sessionId: string } }, _res: unknown, next: () => void) => {
    req.auth = {
      wallet: "0x0000000000000000000000000000000000000001",
      role: "VOTER",
      sessionId: "test-session"
    };
    next();
  }
}));

vi.mock("../../src/db/prisma.js", () => ({
  probePrisma: mocks.probePrisma,
  prisma: {
    roleWallet: {
      count: mocks.roleWalletCount
    },
    electionMirror: {
      findFirst: mocks.electionMirrorFindFirst
    }
  }
}));

vi.mock("../../src/db/redis.js", () => ({
  probeRedis: mocks.probeRedis,
  redis: {}
}));

vi.mock("../../src/db/r2.js", () => ({
  probeR2: mocks.probeR2
}));

import { healthRouter, systemRouter } from "../../src/health/routes.js";
import { requestIdMiddleware } from "../../src/lib/request-id.js";
import { appErrorHandler } from "../../src/middleware/error-handler.js";

function createTestApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(healthRouter);
  app.use("/api/v1", systemRouter);
  app.use(appErrorHandler);
  return app;
}

describe("health and system routes", () => {
  beforeEach(() => {
    mocks.probePrisma.mockResolvedValue(true);
    mocks.probeRedis.mockResolvedValue(true);
    mocks.probeR2.mockResolvedValue(true);
    mocks.roleWalletCount.mockResolvedValue(1);
    mocks.electionMirrorFindFirst.mockResolvedValue({
      lastSyncedAt: new Date(Date.now() - 5 * 1000)
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ result: "0xaa36a7" })
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns liveness payload on /health", async () => {
    const app = createTestApp();

    const response = await request(app).get("/health").expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.service).toBe("dvote-backend");
  });

  it("rejects /ready without internal API key", async () => {
    const app = createTestApp();

    const response = await request(app).get("/ready").expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns ready status when all probes pass", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get("/ready")
      .set("x-internal-api-key", process.env.INTERNAL_API_KEY!)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe("ready");
    expect(response.body.data.checks).toEqual({
      turso: true,
      redis: true,
      r2: true,
      rpc: true
    });
  });

  it("returns not-ready when any dependency probe fails", async () => {
    mocks.probeRedis.mockResolvedValue(false);
    const app = createTestApp();

    const response = await request(app)
      .get("/ready")
      .set("x-internal-api-key", process.env.INTERNAL_API_KEY!)
      .expect(503);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe("not-ready");
    expect(response.body.data.checks.redis).toBe(false);
  });

  it("returns startup completion contract", async () => {
    mocks.roleWalletCount.mockResolvedValue(2);
    const app = createTestApp();

    const response = await request(app)
      .get("/startup")
      .set("x-internal-api-key", process.env.INTERNAL_API_KEY!)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe("startup-complete");
    expect(response.body.data.checks.roleBootstrap).toBe(true);
  });

  it("returns freshness metadata from latest sync", async () => {
    const app = createTestApp();

    const response = await request(app).get("/api/v1/system/freshness").expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.freshnessState).toBe("fresh");
    expect(response.body.data.nextPollAfterSec).toBe(5);
    expect(typeof response.body.data.lastSyncedAt).toBe("string");
  });
});
