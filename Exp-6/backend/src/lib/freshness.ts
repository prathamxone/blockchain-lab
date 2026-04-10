import { APP_CONSTANTS, FRESHNESS_STATES, type FreshnessState } from "../config/constants.js";

export interface FreshnessMeta {
  lastSyncedAt: string | null;
  nextPollAfterSec: number;
  freshnessState: FreshnessState;
}

export function deriveFreshnessState(lastSyncedAt: Date | null): FreshnessState {
  if (!lastSyncedAt) {
    return FRESHNESS_STATES.degraded;
  }

  const ageSec = Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000));
  if (ageSec <= APP_CONSTANTS.freshnessFreshMaxSec) {
    return FRESHNESS_STATES.fresh;
  }

  if (ageSec <= APP_CONSTANTS.freshnessStaleMaxSec) {
    return FRESHNESS_STATES.stale;
  }

  return FRESHNESS_STATES.degraded;
}

export function deriveFreshnessMeta(lastSyncedAt: Date | null): FreshnessMeta {
  const freshnessState = deriveFreshnessState(lastSyncedAt);

  return {
    lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
    nextPollAfterSec: freshnessState === FRESHNESS_STATES.fresh ? 5 : 3,
    freshnessState
  };
}
