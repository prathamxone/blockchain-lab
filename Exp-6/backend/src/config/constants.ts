export const APP_CONSTANTS = {
  voteTokenTtlSec: 60,
  uploadContractTtlSec: 600,
  rerunSlaDays: 7,
  rerunDueSoonHours: 48,
  candidateCap: 15,
  sessionIdleTimeoutSec: 1800,
  authChallengeTtlSec: 300,
  authLockWindowSec: 900,
  authLockMaxAttempts: 5,
  paginationDefaultLimit: 25,
  paginationMaxLimit: 100,
  paginationCursorTtlSec: 900,
  orderKey: "createdAt:desc,id:desc",
  freshnessFreshMaxSec: 30,
  freshnessStaleMaxSec: 120,
  voteStatusRecheckAfterSec: 3,
  voteLookupWindowSec: 120,
  globalApiRateLimitPerMin: 60,
  voteRouteRateLimitPerMin: 3,
  anomalyLimitWindowSec: 900,
  anomalyLimitMaxPerWindow: 10,
  aadhaarFallbackMinEvidenceRefs: 1,
  kycSubmitMinFinalizedArtifacts: 2,
  refreshCookieName: "dvote_refresh_token",
  csrfCookieName: "dvote_csrf_token"
} as const;

export const FRESHNESS_STATES = {
  fresh: "fresh",
  stale: "stale",
  degraded: "degraded"
} as const;

export type FreshnessState = (typeof FRESHNESS_STATES)[keyof typeof FRESHNESS_STATES];
