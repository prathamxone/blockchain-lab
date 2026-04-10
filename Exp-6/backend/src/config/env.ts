import "dotenv/config";

import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_PATH: z.string().min(1).default("/api/v1"),
  FRONTEND_ORIGINS: z.string().min(1),
  CORS_ALLOW_CREDENTIALS: z.coerce.boolean().default(true),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().positive().default(604800),
  SESSION_IDLE_TIMEOUT_SEC: z.coerce.number().int().positive().default(1800),
  CSRF_SECRET: z.string().min(16),

  INTERNAL_API_KEY: z.string().min(16),
  CRON_SECRET: z.string().min(16),
  READY_IP_ALLOWLIST: z.string().optional(),

  ADMIN_WALLET: z.string().optional(),
  ECI_WALLET: z.string().optional(),
  SRO_WALLET: z.string().optional(),
  RO_WALLET: z.string().optional(),
  OBSERVER_WALLET: z.string().optional(),

  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_REGION: z.string().min(1).default("auto"),

  KYC_ENC_ACTIVE_KEY_VERSION: z.string().min(1),
  KYC_ENC_KEY_V1_BASE64: z.string().min(1),
  KYC_ENC_KEY_V2_BASE64: z.string().optional(),
  KYC_HASH_SALT: z.string().min(16),

  SCAN_ADAPTER_ENABLED: z.coerce.boolean().default(true),

  CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  RPC_URL: z.string().url(),

  UPLOAD_CONTRACT_TTL_SEC: z.coerce.number().int().positive().default(600),
  UPLOAD_DOC_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  UPLOAD_PROFILE_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),

  VOTE_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(60),
  VOTE_TIMEOUT_LOOKUP_WINDOW_SEC: z.coerce.number().int().positive().default(120)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Environment validation failed: ${formatted}`);
}

const values = parsed.data;

const frontendOrigins = values.FRONTEND_ORIGINS.split(",")
  .map((item) => item.trim())
  .filter((item) => item.length > 0);

if (frontendOrigins.length === 0) {
  throw new Error("Environment validation failed: FRONTEND_ORIGINS cannot be empty");
}

const readyIpAllowlist = (values.READY_IP_ALLOWLIST ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter((item) => item.length > 0);

export const env = {
  ...values,
  FRONTEND_ORIGINS: frontendOrigins,
  READY_IP_ALLOWLIST: readyIpAllowlist,
  R2_ENDPOINT: `https://${values.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
} as const;

export type Env = typeof env;
