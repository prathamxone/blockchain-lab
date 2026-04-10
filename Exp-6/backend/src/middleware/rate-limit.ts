import type { NextFunction, Request, Response } from "express";

import { APP_CONSTANTS } from "../config/constants.js";
import { redis } from "../db/redis.js";
import { appError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

interface RedisRateLimitConfig {
  prefix: string;
  max: number;
  windowSec: number;
  keyBuilder: (req: Request) => string | null;
  message: string;
}

async function consumeRateLimitWindow(input: {
  redisKey: string;
  windowSec: number;
}): Promise<{ count: number; ttlSec: number }> {
  const count = await redis.incr(input.redisKey);
  if (count === 1) {
    await redis.expire(input.redisKey, input.windowSec);
  }

  const ttl = Number((await redis.ttl(input.redisKey)) ?? input.windowSec);

  return {
    count,
    ttlSec: Number.isFinite(ttl) ? Math.max(ttl, 0) : input.windowSec
  };
}

function createRedisRateLimit(config: RedisRateLimitConfig) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const identifier = config.keyBuilder(req);
    if (!identifier) {
      next();
      return;
    }

    const bucket = Math.floor(Date.now() / (config.windowSec * 1000));
    const redisKey = `${config.prefix}:${identifier}:${bucket}`;

    try {
      const usage = await consumeRateLimitWindow({
        redisKey,
        windowSec: config.windowSec
      });

      if (usage.count > config.max) {
        next(appError.rateLimited(`${config.message}. Retry after ${usage.ttlSec} seconds`));
        return;
      }

      next();
    } catch (error) {
      logger.warn("Rate limit backend unavailable; failing open", {
        route: req.path,
        method: req.method,
        message: error instanceof Error ? error.message : "Unknown rate-limit error"
      });
      next();
    }
  };
}

export const globalApiIpRateLimit = createRedisRateLimit({
  prefix: "ratelimit:global:ip",
  max: APP_CONSTANTS.globalApiRateLimitPerMin,
  windowSec: 60,
  keyBuilder: (req) => req.ip ?? "unknown",
  message: "Global API rate limit exceeded"
});

export const voteWalletRateLimit = createRedisRateLimit({
  prefix: "ratelimit:votes:wallet",
  max: APP_CONSTANTS.voteRouteRateLimitPerMin,
  windowSec: 60,
  keyBuilder: (req) => req.auth?.wallet?.toLowerCase() ?? null,
  message: "Vote route rate limit exceeded"
});

export const anomalyWalletRateLimit = createRedisRateLimit({
  prefix: "ratelimit:anomaly:wallet",
  max: APP_CONSTANTS.anomalyLimitMaxPerWindow,
  windowSec: APP_CONSTANTS.anomalyLimitWindowSec,
  keyBuilder: (req) => req.auth?.wallet?.toLowerCase() ?? null,
  message: "Anomaly report rate limit exceeded"
});
