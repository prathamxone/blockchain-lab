const DEFAULT_TIMEOUT_MS = 10_000;

export function resolveOptionalInput(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized.startsWith("__MANUAL_") || normalized.startsWith("__AUTO_")) {
    return undefined;
  }

  return normalized;
}

function joinUrl(baseUrl, path) {
  const left = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const right = path.startsWith("/") ? path : `/${path}`;
  return `${left}${right}`;
}

async function requestJson(baseUrl, path, options = {}) {
  const url = joinUrl(baseUrl, path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const headers = {
    Accept: "application/json",
    ...(options.headers ?? {})
  };

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    const text = await response.text();
    let payload = null;

    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: {
        error: error instanceof Error ? error.message : "Request failed"
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

function result(ok, label, detail) {
  if (ok) {
    console.log(`[pass] ${label} :: ${detail}`);
  } else {
    console.error(`[fail] ${label} :: ${detail}`);
  }

  return ok;
}

export async function runSmokeChecks(config) {
  const failures = [];
  const baseHeaders = config.baseHeaders ?? {};

  console.log(`\nRunning smoke checks: ${config.label}`);
  console.log(`Base URL: ${config.baseUrl}`);

  const health = await requestJson(config.baseUrl, "/health", { headers: baseHeaders });
  if (!result(health.status === 200, "health", `status=${health.status}`)) {
    failures.push("health");
  }

  const readyUnauthorized = await requestJson(config.baseUrl, "/ready", { headers: baseHeaders });
  if (!result(readyUnauthorized.status === 401, "ready unauthorized", `status=${readyUnauthorized.status}`)) {
    failures.push("ready-unauthorized");
  }

  const startupUnauthorized = await requestJson(config.baseUrl, "/startup", { headers: baseHeaders });
  if (!result(startupUnauthorized.status === 401, "startup unauthorized", `status=${startupUnauthorized.status}`)) {
    failures.push("startup-unauthorized");
  }

  if (config.internalApiKey) {
    const readyAuthorized = await requestJson(config.baseUrl, "/ready", {
      headers: {
        ...baseHeaders,
        "x-internal-api-key": config.internalApiKey
      }
    });

    const readyOk = readyAuthorized.status === 200 || readyAuthorized.status === 503;
    if (!result(readyOk, "ready authorized", `status=${readyAuthorized.status}`)) {
      failures.push("ready-authorized");
    }

    const startupAuthorized = await requestJson(config.baseUrl, "/startup", {
      headers: {
        ...baseHeaders,
        "x-internal-api-key": config.internalApiKey
      }
    });

    if (!result(startupAuthorized.status === 200, "startup authorized", `status=${startupAuthorized.status}`)) {
      failures.push("startup-authorized");
    }
  } else {
    console.log("[skip] internal API key checks :: INTERNAL_API_KEY not provided");
  }

  if (config.cronSecret) {
    const cron = await requestJson(config.baseUrl, "/api/v1/internal/cron/key-rotation", {
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${config.cronSecret}`
      }
    });

    if (!result(cron.status === 200, "cron key-rotation", `status=${cron.status}`)) {
      failures.push("cron-key-rotation");
    }
  } else {
    console.log("[skip] cron checks :: CRON_SECRET not provided");
  }

  if (config.authBearerToken) {
    const freshness = await requestJson(config.baseUrl, "/api/v1/system/freshness", {
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${config.authBearerToken}`
      }
    });

    const freshnessOk =
      freshness.status === 200 &&
      Boolean(freshness.payload?.data?.freshnessState) &&
      typeof freshness.payload?.data?.nextPollAfterSec === "number";

    if (!result(freshnessOk, "system freshness", `status=${freshness.status}`)) {
      failures.push("system-freshness");
    }
  } else {
    console.log("[skip] system freshness auth check :: auth bearer token not provided");
  }

  if (failures.length > 0) {
    console.error(`\nSmoke checks failed (${failures.length}): ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("\nSmoke checks passed.");
}
