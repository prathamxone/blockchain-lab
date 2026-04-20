/**
 * DVote Frontend — Vote State Machine Integration Tests
 *
 * Tests for vote token lifecycle, cast states, timeout-uncertain handling,
 * and 60s token expiry enforcement.
 *
 * Authority: walkthrough Phase P + L-D1 + L-D2 + CDM-13
 */

import { describe, it, expect, vi } from "vitest"

type VoteState =
  | "idle"
  | "token-requested"
  | "cast-ready"
  | "submitting"
  | "confirmed"
  | "failed"
  | "expired"
  | "conflict"
  | "timeout-uncertain"

interface VoteContext {
  state: VoteState
  tokenIssuedAt?: Date
  tokenExpiresAt?: Date
  voteIntentId?: string
  error?: string
}

const TOKEN_TTL_MS = 60000 // 60 seconds
const RECHECK_INTERVAL_MS = 3000 // 3 seconds from backend

function getRemainingTime(ctx: VoteContext): number {
  if (!ctx.tokenExpiresAt) return 0
  return Math.max(0, ctx.tokenExpiresAt.getTime() - Date.now())
}

function isTokenExpired(ctx: VoteContext): boolean {
  if (!ctx.tokenExpiresAt) return false
  return Date.now() > ctx.tokenExpiresAt.getTime()
}

function canRequestToken(freshnessStatus: string): boolean {
  return freshnessStatus !== "degraded"
}

function transitionVote(ctx: VoteContext, event: string): VoteContext {
  switch (ctx.state) {
    case "idle":
      if (event === "request-token" && canRequestToken("fresh")) {
        const now = new Date()
        return {
          ...ctx,
          state: "token-requested",
          tokenIssuedAt: now,
          tokenExpiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
        }
      }
      break
    case "token-requested":
      if (event === "token-received") {
        return { ...ctx, state: "cast-ready" }
      }
      break
    case "cast-ready":
      if (event === "cast-vote") {
        return { ...ctx, state: "submitting" }
      }
      if (event === "token-expired") {
        return { ...ctx, state: "expired" }
      }
      break
    case "submitting":
      if (event === "vote-confirmed") {
        return { ...ctx, state: "confirmed" }
      }
      if (event === "vote-failed") {
        return { ...ctx, state: "failed" }
      }
      if (event === "vote-conflict") {
        return { ...ctx, state: "conflict" }
      }
      if (event === "relay-timeout") {
        return { ...ctx, state: "timeout-uncertain" }
      }
      break
    case "timeout-uncertain":
      if (event === "status-confirmed") {
        return { ...ctx, state: "confirmed" }
      }
      if (event === "status-failed") {
        return { ...ctx, state: "failed" }
      }
      // Cannot recast until terminal state or lookup window expires
      break
    case "expired":
    case "confirmed":
    case "failed":
    case "conflict":
      // Terminal states - no transitions out
      break
  }
  return ctx
}

describe("Vote Token Lifecycle", () => {
  describe("Token Request", () => {
    it("requests token when freshness is fresh", () => {
      expect(canRequestToken("fresh")).toBe(true)
    })

    it("blocks token request when freshness is degraded", () => {
      expect(canRequestToken("degraded")).toBe(false)
    })
  })

  describe("Token Timing", () => {
    it("sets token expiry to 60 seconds after issuance", () => {
      // Use UTC to avoid timezone-dependent failures
      const issuedAt = new Date(Date.UTC(2024, 0, 1, 12, 0, 0))
      const expiresAt = new Date(issuedAt.getTime() + TOKEN_TTL_MS)
      expect(expiresAt.toISOString()).toBe("2024-01-01T12:01:00.000Z")
    })

    it("calculates remaining time correctly", () => {
      const ctx: VoteContext = {
        state: "cast-ready",
        tokenIssuedAt: new Date(),
        tokenExpiresAt: new Date(Date.now() + 30000), // 30 seconds from now
      }
      const remaining = getRemainingTime(ctx)
      expect(remaining).toBeGreaterThan(29000)
      expect(remaining).toBeLessThanOrEqual(30000)
    })

    it("returns 0 when no token issued", () => {
      const ctx: VoteContext = { state: "idle" }
      expect(getRemainingTime(ctx)).toBe(0)
    })
  })

  describe("Token Expiry", () => {
    it("detects expired token", () => {
      const ctx: VoteContext = {
        state: "cast-ready",
        tokenIssuedAt: new Date(Date.now() - 70000),
        tokenExpiresAt: new Date(Date.now() - 10000), // 10 seconds ago
      }
      expect(isTokenExpired(ctx)).toBe(true)
    })

    it("detects valid token", () => {
      const ctx: VoteContext = {
        state: "cast-ready",
        tokenIssuedAt: new Date(),
        tokenExpiresAt: new Date(Date.now() + 30000),
      }
      expect(isTokenExpired(ctx)).toBe(false)
    })
  })
})

describe("Vote State Transitions", () => {
  describe("Happy Path", () => {
    it("transitions from idle to token-requested", () => {
      let ctx: VoteContext = { state: "idle" }
      ctx = transitionVote(ctx, "request-token")
      expect(ctx.state).toBe("token-requested")
      expect(ctx.tokenExpiresAt).toBeDefined()
    })

    it("transitions from token-requested to cast-ready", () => {
      let ctx: VoteContext = { state: "token-requested" }
      ctx = transitionVote(ctx, "token-received")
      expect(ctx.state).toBe("cast-ready")
    })

    it("transitions from cast-ready to submitting", () => {
      let ctx: VoteContext = { state: "cast-ready" }
      ctx = transitionVote(ctx, "cast-vote")
      expect(ctx.state).toBe("submitting")
    })

    it("transitions from submitting to confirmed", () => {
      let ctx: VoteContext = { state: "submitting" }
      ctx = transitionVote(ctx, "vote-confirmed")
      expect(ctx.state).toBe("confirmed")
    })
  })

  describe("Token Expiry Path", () => {
    it("transitions to expired when token expires before cast", () => {
      let ctx: VoteContext = { state: "cast-ready" }
      ctx = transitionVote(ctx, "token-expired")
      expect(ctx.state).toBe("expired")
    })
  })

  describe("Timeout-Uncertain Path (CDM-13)", () => {
    it("enters timeout-uncertain when relay times out", () => {
      let ctx: VoteContext = { state: "submitting" }
      ctx = transitionVote(ctx, "relay-timeout")
      expect(ctx.state).toBe("timeout-uncertain")
    })

    it("blocks recast from timeout-uncertain", () => {
      let ctx: VoteContext = { state: "timeout-uncertain", voteIntentId: "intent-123" }
      // Attempting to cast again should stay in timeout-uncertain
      const result = transitionVote(ctx, "cast-vote")
      expect(result.state).toBe("timeout-uncertain")
    })

    it("exits timeout-uncertain when status confirmed", () => {
      let ctx: VoteContext = { state: "timeout-uncertain" }
      ctx = transitionVote(ctx, "status-confirmed")
      expect(ctx.state).toBe("confirmed")
    })

    it("exits timeout-uncertain when status failed", () => {
      let ctx: VoteContext = { state: "timeout-uncertain" }
      ctx = transitionVote(ctx, "status-failed")
      expect(ctx.state).toBe("failed")
    })
  })

  describe("Conflict Path", () => {
    it("handles vote conflict (409)", () => {
      let ctx: VoteContext = { state: "submitting" }
      ctx = transitionVote(ctx, "vote-conflict")
      expect(ctx.state).toBe("conflict")
    })
  })
})

describe("Safety Buffer Warning (L-D1)", () => {
  function getSafetyBufferWarning(remainingMs: number): boolean {
    // Warning triggers at ≤10 seconds remaining
    return remainingMs <= 10000 && remainingMs > 0
  }

  it("triggers warning at 10 seconds", () => {
    expect(getSafetyBufferWarning(10000)).toBe(true)
  })

  it("triggers warning at 5 seconds", () => {
    expect(getSafetyBufferWarning(5000)).toBe(true)
  })

  it("does not trigger when more than 10 seconds", () => {
    expect(getSafetyBufferWarning(15000)).toBe(false)
  })

  it("does not trigger when expired", () => {
    expect(getSafetyBufferWarning(0)).toBe(false)
  })
})

describe("Recheck Polling (L-D2)", () => {
  it("recheck interval is 3 seconds per backend constant", () => {
    expect(RECHECK_INTERVAL_MS).toBe(3000)
  })
})

describe("Terminal States", () => {
  it("confirmed is terminal", () => {
    let ctx: VoteContext = { state: "confirmed" }
    const result = transitionVote(ctx, "cast-vote")
    expect(result.state).toBe("confirmed") // No transition
  })

  it("failed is terminal", () => {
    let ctx: VoteContext = { state: "failed" }
    const result = transitionVote(ctx, "cast-vote")
    expect(result.state).toBe("failed") // No transition
  })

  it("conflict is terminal", () => {
    let ctx: VoteContext = { state: "conflict" }
    const result = transitionVote(ctx, "cast-vote")
    expect(result.state).toBe("conflict") // No transition
  })
})