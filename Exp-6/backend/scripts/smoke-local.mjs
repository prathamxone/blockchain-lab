import { runSmokeChecks } from "./smoke-core.mjs";

const baseUrl = process.env.SMOKE_LOCAL_BASE_URL ?? "http://localhost:4000";

await runSmokeChecks({
  label: "local",
  baseUrl,
  internalApiKey: process.env.INTERNAL_API_KEY,
  cronSecret: process.env.CRON_SECRET,
  authBearerToken: process.env.SMOKE_LOCAL_AUTH_BEARER
});
