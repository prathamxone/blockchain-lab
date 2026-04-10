import { describe, expect, it } from "vitest";

import { APP_CONSTANTS, FRESHNESS_STATES } from "../../src/config/constants.js";
import { deriveFreshnessMeta, deriveFreshnessState } from "../../src/lib/freshness.js";

describe("freshness contract", () => {
  it("returns degraded when lastSyncedAt is missing", () => {
    const state = deriveFreshnessState(null);
    const meta = deriveFreshnessMeta(null);

    expect(state).toBe(FRESHNESS_STATES.degraded);
    expect(meta).toEqual({
      lastSyncedAt: null,
      freshnessState: FRESHNESS_STATES.degraded,
      nextPollAfterSec: 3
    });
  });

  it("returns fresh for sync within fresh threshold", () => {
    const syncedAt = new Date(Date.now() - 5 * 1000);

    const state = deriveFreshnessState(syncedAt);
    const meta = deriveFreshnessMeta(syncedAt);

    expect(state).toBe(FRESHNESS_STATES.fresh);
    expect(meta.freshnessState).toBe(FRESHNESS_STATES.fresh);
    expect(meta.nextPollAfterSec).toBe(5);
  });

  it("returns stale between fresh and stale thresholds", () => {
    const syncedAt = new Date(Date.now() - (APP_CONSTANTS.freshnessFreshMaxSec + 5) * 1000);

    const state = deriveFreshnessState(syncedAt);
    const meta = deriveFreshnessMeta(syncedAt);

    expect(state).toBe(FRESHNESS_STATES.stale);
    expect(meta.freshnessState).toBe(FRESHNESS_STATES.stale);
    expect(meta.nextPollAfterSec).toBe(3);
  });

  it("returns degraded when stale threshold is exceeded", () => {
    const syncedAt = new Date(Date.now() - (APP_CONSTANTS.freshnessStaleMaxSec + 5) * 1000);

    const state = deriveFreshnessState(syncedAt);
    const meta = deriveFreshnessMeta(syncedAt);

    expect(state).toBe(FRESHNESS_STATES.degraded);
    expect(meta.freshnessState).toBe(FRESHNESS_STATES.degraded);
    expect(meta.nextPollAfterSec).toBe(3);
  });
});
