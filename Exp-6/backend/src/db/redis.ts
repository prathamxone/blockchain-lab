import { Redis } from "@upstash/redis";

import { env } from "../config/env.js";

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN
});

export async function probeRedis(): Promise<boolean> {
  const key = `probe:backend:${Date.now()}`;

  try {
    await redis.set(key, "1", { ex: 10 });
    await redis.expire(key, 10);
    const ttl = await redis.ttl(key);
    await redis.del(key);

    return typeof ttl === "number" && ttl >= -1;
  } catch {
    return false;
  }
}
