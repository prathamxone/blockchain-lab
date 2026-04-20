/**
 * DVote Frontend — Freshness State Unit Tests
 *
 * Tests for freshness state transitions, polling behavior, and
 * sensitive action gating based on freshness status.
 *
 * Authority: walkthrough Phase J + CDM-9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

type FreshnessStatus = "fresh" | "stale" | "degraded"

interface FreshnessState {
  status: FreshnessStatus
  lastChecked: Date
}

interface FreshnessConfig {
  activeTabPollingMs: number
  backgroundTabPollingMs: number
  debounceMs: number
}

const DEFAULT_CONFIG: FreshnessConfig = {
  activeTabPollingMs: 15000,   // 15 seconds
  backgroundTabPollingMs: 60000, // 60 seconds
  debounceMs: 5000, // 5 second debounce to prevent flapping
}

// Freshness state machine transitions
function computeFreshnessState(
  lastChecked: Date,
  now: Date,
  isActiveTab: boolean
): FreshnessStatus {
  const elapsed = now.getTime() - lastChecked.getTime()
  const threshold = isActiveTab
    ? DEFAULT_CONFIG.activeTabPollingMs
    : DEFAULT_CONFIG.backgroundTabPollingMs

  if (elapsed > threshold * 2) {
    return "degraded" // Beyond 2x threshold = degraded
  }
  if (elapsed > threshold) {
    return "stale" // Beyond 1x threshold = stale
  }
  return "fresh"
}

function shouldBlockSensitiveActions(status: FreshnessStatus): boolean {
  return status === "degraded"
}

function shouldDebounceStateChange(
  currentStatus: FreshnessStatus,
  newStatus: FreshnessStatus,
  lastDebounceTime: Date | null,
  now: Date
): boolean {
  if (currentStatus === newStatus) return false // No change to debounce
  if (!lastDebounceTime) return false // No prior debounce
  const elapsed = now.getTime() - lastDebounceTime.getTime()
  return elapsed < DEFAULT_CONFIG.debounceMs
}

describe("Freshness State Machine", () => {
  describe("computeFreshnessState", () => {
    it("returns fresh when lastChecked is within active tab threshold", () => {
      const lastChecked = new Date(Date.now() - 10000) // 10 seconds ago
      const now = new Date()
      const result = computeFreshnessState(lastChecked, now, true)
      expect(result).toBe("fresh")
    })

    it("returns stale when elapsed exceeds active tab threshold", () => {
      const lastChecked = new Date(Date.now() - 20000) // 20 seconds ago (> 15s)
      const now = new Date()
      const result = computeFreshnessState(lastChecked, now, true)
      expect(result).toBe("stale")
    })

    it("returns degraded when elapsed exceeds 2x active tab threshold", () => {
      const lastChecked = new Date(Date.now() - 40000) // 40 seconds ago (> 30s)
      const now = new Date()
      const result = computeFreshnessState(lastChecked, now, true)
      expect(result).toBe("degraded")
    })

    it("uses background tab threshold when isActiveTab is false", () => {
      const lastChecked = new Date(Date.now() - 30000) // 30 seconds ago
      const now = new Date()
      // With active tab (15s threshold): stale (30 > 15)
      // With background tab (60s threshold): fresh (30 < 60)
      const activeResult = computeFreshnessState(lastChecked, now, true)
      const bgResult = computeFreshnessState(lastChecked, now, false)
      expect(activeResult).toBe("stale")
      expect(bgResult).toBe("fresh")
    })
  })

  describe("shouldBlockSensitiveActions", () => {
    it("blocks sensitive actions when degraded", () => {
      expect(shouldBlockSensitiveActions("degraded")).toBe(true)
    })

    it("does not block when fresh", () => {
      expect(shouldBlockSensitiveActions("fresh")).toBe(false)
    })

    it("does not block when stale (warning only)", () => {
      expect(shouldBlockSensitiveActions("stale")).toBe(false)
    })
  })

  describe("shouldDebounceStateChange", () => {
    it("does not debounce when no prior debounce time", () => {
      const result = shouldDebounceStateChange("fresh", "degraded", null, new Date())
      expect(result).toBe(false)
    })

    it("does not debounce when enough time has passed", () => {
      const lastDebounce = new Date(Date.now() - 6000) // 6 seconds ago (> 5s debounce)
      const result = shouldDebounceStateChange("fresh", "degraded", lastDebounce, new Date())
      expect(result).toBe(false)
    })

    it("debounces when within debounce window", () => {
      const lastDebounce = new Date(Date.now() - 3000) // 3 seconds ago (< 5s debounce)
      const result = shouldDebounceStateChange("fresh", "degraded", lastDebounce, new Date())
      expect(result).toBe(true)
    })

    it("does not debounce when status unchanged", () => {
      const lastDebounce = new Date(Date.now() - 3000)
      const result = shouldDebounceStateChange("degraded", "degraded", lastDebounce, new Date())
      expect(result).toBe(false)
    })
  })

  describe("Polling Interval Selection", () => {
    it("selects 15s interval for active tab", () => {
      const interval = DEFAULT_CONFIG.activeTabPollingMs
      expect(interval).toBe(15000)
    })

    it("selects 60s interval for background tab", () => {
      const interval = DEFAULT_CONFIG.backgroundTabPollingMs
      expect(interval).toBe(60000)
    })
  })

  describe("Sensitive Action Gate Integration", () => {
    // These would be used with the useSensitiveActionGate hook
    function getActionGateResult(freshnessStatus: FreshnessStatus): { isBlocked: boolean; reason: string } {
      if (freshnessStatus === "degraded") {
        return {
          isBlocked: true,
          reason: "System freshness degraded. Please wait for reconnection.",
        }
      }
      return { isBlocked: false, reason: "" }
    }

    it("blocks vote cast when degraded", () => {
      const result = getActionGateResult("degraded")
      expect(result.isBlocked).toBe(true)
      expect(result.reason).toContain("degraded")
    })

    it("allows vote cast when fresh", () => {
      const result = getActionGateResult("fresh")
      expect(result.isBlocked).toBe(false)
    })

    it("allows vote cast when stale (warning only)", () => {
      const result = getActionGateResult("stale")
      expect(result.isBlocked).toBe(false)
    })
  })
})

describe("Freshness Config Constants", () => {
  it("active tab polling is 15 seconds", () => {
    expect(DEFAULT_CONFIG.activeTabPollingMs).toBe(15000)
  })

  it("background tab polling is 60 seconds", () => {
    expect(DEFAULT_CONFIG.backgroundTabPollingMs).toBe(60000)
  })

  it("debounce window is 5 seconds", () => {
    expect(DEFAULT_CONFIG.debounceMs).toBe(5000)
  })
})