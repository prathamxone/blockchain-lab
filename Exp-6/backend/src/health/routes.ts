import { Router, type Request } from "express";

import { requireAuth } from "../auth/auth.middleware.js";
import { env } from "../config/env.js";
import { probePrisma, prisma } from "../db/prisma.js";
import { probeR2 } from "../db/r2.js";
import { probeRedis } from "../db/redis.js";
import { AppError, appError } from "../lib/errors.js";
import { deriveFreshnessMeta } from "../lib/freshness.js";
import { sendSuccess } from "../lib/http.js";

interface DependencyChecks {
  turso: boolean;
  redis: boolean;
  r2: boolean;
  rpc: boolean;
}

async function probeRpc(): Promise<boolean> {
  const timeoutMs = 2500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(env.RPC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { result?: unknown };
    return typeof payload.result === "string";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function collectDependencyChecks(): Promise<DependencyChecks> {
  const turso = await probePrisma();
  const redis = await probeRedis();
  const r2 = await probeR2();
  const rpc = await probeRpc();

  return {
    turso,
    redis,
    r2,
    rpc
  };
}

function assertInternalAccess(req: Request): void {
  const apiKey = req.header("x-internal-api-key");
  if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid internal API key");
  }

  if (env.READY_IP_ALLOWLIST.length > 0) {
    const sourceIp = req.ip ?? "";
    if (!env.READY_IP_ALLOWLIST.includes(sourceIp)) {
      throw new AppError(403, "FORBIDDEN", "Source IP is not allowlisted");
    }
  }
}

export const healthRouter = Router();
export const systemRouter = Router();

healthRouter.get("/health", (_req, res) => {
  sendSuccess(res, 200, {
    status: "ok",
    service: "dvote-backend",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/ready", async (req, res) => {
  assertInternalAccess(req);

  const checks = await collectDependencyChecks();
  const ready = checks.turso && checks.redis && checks.r2 && checks.rpc;

  sendSuccess(res, ready ? 200 : 503, {
    status: ready ? "ready" : "not-ready",
    checks,
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/startup", async (req, res) => {
  assertInternalAccess(req);

  const roleBootstrapCount = await prisma.roleWallet.count({
    where: { active: true }
  });

  sendSuccess(res, 200, {
    status: "startup-complete",
    checks: {
      envLoaded: true,
      roleBootstrap: roleBootstrapCount > 0,
      migrationsChecked: false
    },
    timestamp: new Date().toISOString()
  });
});

systemRouter.get("/system/freshness", requireAuth, async (_req, res) => {
  const latestSync = await prisma.electionMirror.findFirst({
    where: {
      lastSyncedAt: {
        not: null
      }
    },
    orderBy: {
      lastSyncedAt: "desc"
    },
    select: {
      lastSyncedAt: true
    }
  });

  const freshness = deriveFreshnessMeta(latestSync?.lastSyncedAt ?? null);
  sendSuccess(res, 200, freshness);
});
