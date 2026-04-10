import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const REQUIRED_SECRETS = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CSRF_SECRET",
  "INTERNAL_API_KEY",
  "CRON_SECRET",
  "KYC_HASH_SALT",
  "KYC_ENC_KEY_V1_BASE64"
];

const SMOKE_ENV_DEFAULTS = {
  SMOKE_LOCAL_BASE_URL: "http://localhost:4000",
  SMOKE_LOCAL_AUTH_BEARER: "__MANUAL_LOCAL_ACCESS_TOKEN__",
  SMOKE_PREVIEW_BASE_URL: "http://localhost:4000",
  SMOKE_PREVIEW_BEARER_TOKEN: "__MANUAL_PREVIEW_BEARER_TOKEN__",
  SMOKE_PREVIEW_AUTH_BEARER: "__MANUAL_PREVIEW_ACCESS_TOKEN__"
};

function runOpenSsl(command) {
  try {
    return execSync(command, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

function generateHex(bytes) {
  return runOpenSsl(`openssl rand -hex ${bytes}`) ?? randomBytes(bytes).toString("hex");
}

function generateBase64(bytes) {
  return runOpenSsl(`openssl rand -base64 ${bytes}`) ?? randomBytes(bytes).toString("base64");
}

function buildSecrets() {
  return {
    JWT_ACCESS_SECRET: generateHex(32),
    JWT_REFRESH_SECRET: generateHex(32),
    CSRF_SECRET: generateHex(32),
    INTERNAL_API_KEY: generateHex(24),
    CRON_SECRET: generateHex(24),
    KYC_HASH_SALT: generateHex(24),
    KYC_ENC_KEY_V1_BASE64: generateBase64(32)
  };
}

function buildEnvValues() {
  return {
    ...buildSecrets(),
    ...SMOKE_ENV_DEFAULTS
  };
}

function applyToEnvFile(envPath, secrets) {
  const original = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = original.length > 0 ? original.split(/\r?\n/) : [];

  for (const [key, value] of Object.entries(secrets)) {
    const prefix = `${key}=`;
    const index = lines.findIndex((line) => line.startsWith(prefix));
    if (index >= 0) {
      lines[index] = `${prefix}${value}`;
    } else {
      lines.push(`${prefix}${value}`);
    }
  }

  const output = `${lines.join("\n").trim()}\n`;
  writeFileSync(envPath, output, "utf8");
}

function printSecrets(secrets) {
  console.log("Generated secrets:\n");
  for (const key of REQUIRED_SECRETS) {
    console.log(`${key}=${secrets[key]}`);
  }

  console.log("\nSmoke env defaults:\n");
  for (const [key, value] of Object.entries(SMOKE_ENV_DEFAULTS)) {
    console.log(`${key}=${value}`);
  }

  console.log("\nVercel CLI helpers (run per target):");
  console.log("vercel env add JWT_ACCESS_SECRET production");
  console.log("vercel env add JWT_ACCESS_SECRET preview");
  console.log("vercel env add JWT_ACCESS_SECRET development");
}

const envValues = buildEnvValues();
const shouldApply = process.argv.includes("--apply");

if (shouldApply) {
  const envPath = join(process.cwd(), ".env");
  applyToEnvFile(envPath, envValues);
  console.log(`Applied ${Object.keys(envValues).length} generated/default env values to ${envPath}`);
} else {
  printSecrets(envValues);
}
