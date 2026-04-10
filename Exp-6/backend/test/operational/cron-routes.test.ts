import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditWrite: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("../../src/audit/audit.service.js", () => ({
  auditService: {
    write: mocks.auditWrite
  }
}));

vi.mock("../../src/db/prisma.js", () => ({
  prisma: {
    electionMirror: {
      updateMany: mocks.updateMany
    }
  },
  probePrisma: vi.fn()
}));

import { requestIdMiddleware } from "../../src/lib/request-id.js";
import { appErrorHandler } from "../../src/middleware/error-handler.js";
import { keyRotationCronRouter } from "../../src/internal/cron/key-rotation.route.js";
import { kycPurgeCronRouter } from "../../src/internal/cron/kyc-purge.route.js";
import { reconcileCronRouter } from "../../src/internal/cron/reconcile.route.js";

function createCronApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.use("/api/v1", keyRotationCronRouter);
  app.use("/api/v1", kycPurgeCronRouter);
  app.use("/api/v1", reconcileCronRouter);
  app.use(appErrorHandler);
  return app;
}

describe("internal cron routes", () => {
  beforeEach(() => {
    mocks.auditWrite.mockReset();
    mocks.updateMany.mockReset();

    mocks.auditWrite.mockResolvedValue(undefined);
    mocks.updateMany.mockResolvedValue({ count: 3 });
  });

  it("rejects unauthorized cron invocations", async () => {
    const app = createCronApp();

    const response = await request(app).get("/api/v1/internal/cron/key-rotation").expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("executes key-rotation cron with bearer auth", async () => {
    const app = createCronApp();

    const response = await request(app)
      .get("/api/v1/internal/cron/key-rotation")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.job).toBe("key-rotation");
    expect(mocks.auditWrite).toHaveBeenCalledTimes(1);
  });

  it("executes kyc-purge cron with hold-flag aware payload", async () => {
    const app = createCronApp();

    const response = await request(app)
      .get("/api/v1/internal/cron/kyc-purge")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.job).toBe("kyc-purge");
    expect(response.body.data.holdFlagAware).toBe(true);
  });

  it("executes reconcile-results cron and reports touched rows", async () => {
    mocks.updateMany.mockResolvedValue({ count: 9 });
    const app = createCronApp();

    const response = await request(app)
      .get("/api/v1/internal/cron/reconcile-results")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.job).toBe("reconcile-results");
    expect(response.body.data.touchedElectionMirrorRows).toBe(9);
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
  });
});
