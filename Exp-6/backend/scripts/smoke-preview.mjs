import { resolveOptionalInput, runSmokeChecks } from "./smoke-core.mjs";

const baseUrl = resolveOptionalInput(process.env.SMOKE_PREVIEW_BASE_URL) ?? process.env.SMOKE_PREVIEW_BASE_URL;

if (!baseUrl) {
  console.error("SMOKE_PREVIEW_BASE_URL is required for preview smoke checks.");
  process.exit(1);
}

const previewBearer = resolveOptionalInput(process.env.SMOKE_PREVIEW_BEARER_TOKEN);
const baseHeaders = previewBearer ? { Authorization: `Bearer ${previewBearer}` } : {};

await runSmokeChecks({
  label: "preview",
  baseUrl,
  baseHeaders,
  internalApiKey: resolveOptionalInput(process.env.INTERNAL_API_KEY),
  cronSecret: resolveOptionalInput(process.env.CRON_SECRET),
  authBearerToken: resolveOptionalInput(process.env.SMOKE_PREVIEW_AUTH_BEARER)
});
