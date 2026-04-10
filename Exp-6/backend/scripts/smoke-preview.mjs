import { runSmokeChecks } from "./smoke-core.mjs";

const baseUrl = process.env.SMOKE_PREVIEW_BASE_URL;

if (!baseUrl) {
  console.error("SMOKE_PREVIEW_BASE_URL is required for preview smoke checks.");
  process.exit(1);
}

const previewBearer = process.env.SMOKE_PREVIEW_BEARER_TOKEN;
const baseHeaders = previewBearer ? { Authorization: `Bearer ${previewBearer}` } : {};

await runSmokeChecks({
  label: "preview",
  baseUrl,
  baseHeaders,
  internalApiKey: process.env.INTERNAL_API_KEY,
  cronSecret: process.env.CRON_SECRET,
  authBearerToken: process.env.SMOKE_PREVIEW_AUTH_BEARER
});
