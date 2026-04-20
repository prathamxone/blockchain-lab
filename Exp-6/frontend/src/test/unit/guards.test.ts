/**
 * DVote Frontend — Route Guards Unit Tests
 *
 * Tests for route guard logic including auth redirect, role enforcement,
 * returnTo flow, and governance lock states.
 *
 * Authority: walkthrough Phase F + CDM-4
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock the route guard functions
// These are the logical functions that would be used in beforeLoad guards

interface GuardContext {
  isAuthenticated: boolean
  role: string | null
  governanceStatus: "unlocked" | "WalletMismatchLocked" | "WalletSwitchPendingApproval"
  returnTo?: string
}

function checkAuthGuard(ctx: GuardContext): { allowed: boolean; redirect?: string } {
  if (!ctx.isAuthenticated) {
    const returnTo = ctx.returnTo ? `?returnTo=${encodeURIComponent(ctx.returnTo)}` : ""
    return { allowed: false, redirect: `/login${returnTo}` }
  }
  return { allowed: true }
}

function checkRoleGuard(ctx: GuardContext, allowedRoles: string[]): { allowed: boolean; redirect?: string } {
  if (!ctx.role || !allowedRoles.includes(ctx.role)) {
    return { allowed: false, redirect: "/" }
  }
  return { allowed: true }
}

function checkGovernanceGuard(ctx: GuardContext): { allowed: boolean; redirect?: string } {
  if (ctx.governanceStatus === "WalletMismatchLocked") {
    return { allowed: false, redirect: "/?governance=locked" }
  }
  if (ctx.governanceStatus === "WalletSwitchPendingApproval") {
    return { allowed: true } // Limited shell allowed
  }
  return { allowed: true }
}

describe("Route Guard Logic", () => {
  describe("Auth Guard", () => {
    it("redirects unauthenticated user to /login", () => {
      const ctx: GuardContext = {
        isAuthenticated: false,
        role: null,
        governanceStatus: "unlocked",
      }
      const result = checkAuthGuard(ctx)
      expect(result.allowed).toBe(false)
      expect(result.redirect).toBe("/login")
    })

    it("redirects with returnTo param when provided", () => {
      const ctx: GuardContext = {
        isAuthenticated: false,
        role: null,
        governanceStatus: "unlocked",
        returnTo: "/elections",
      }
      const result = checkAuthGuard(ctx)
      expect(result.allowed).toBe(false)
      expect(result.redirect).toBe("/login?returnTo=%2Felections")
    })

    it("allows authenticated user through", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "VOTER",
        governanceStatus: "unlocked",
      }
      const result = checkAuthGuard(ctx)
      expect(result.allowed).toBe(true)
      expect(result.redirect).toBeUndefined()
    })
  })

  describe("Role Guard", () => {
    it("blocks user with disallowed role", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "VOTER",
        governanceStatus: "unlocked",
      }
      const result = checkRoleGuard(ctx, ["ADMIN", "SRO", "RO"])
      expect(result.allowed).toBe(false)
      expect(result.redirect).toBe("/")
    })

    it("allows user with matching role", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "ADMIN",
        governanceStatus: "unlocked",
      }
      const result = checkRoleGuard(ctx, ["ADMIN", "SRO", "RO"])
      expect(result.allowed).toBe(true)
    })

    it("blocks when role is null despite auth", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: null,
        governanceStatus: "unlocked",
      }
      const result = checkRoleGuard(ctx, ["ADMIN"])
      expect(result.allowed).toBe(false)
    })
  })

  describe("Governance Guard", () => {
    it("blocks route entry when wallet mismatch locked", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "VOTER",
        governanceStatus: "WalletMismatchLocked",
      }
      const result = checkGovernanceGuard(ctx)
      expect(result.allowed).toBe(false)
      expect(result.redirect).toContain("governance=locked")
    })

    it("allows limited shell when wallet switch pending", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "VOTER",
        governanceStatus: "WalletSwitchPendingApproval",
      }
      const result = checkGovernanceGuard(ctx)
      expect(result.allowed).toBe(true)
    })

    it("allows normal flow when unlocked", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "VOTER",
        governanceStatus: "unlocked",
      }
      const result = checkGovernanceGuard(ctx)
      expect(result.allowed).toBe(true)
    })
  })

  describe("Combined Guard Flow", () => {
    it("stops at auth guard before role check", () => {
      const ctx: GuardContext = {
        isAuthenticated: false,
        role: "ADMIN",
        governanceStatus: "unlocked",
      }
      const authResult = checkAuthGuard(ctx)
      expect(authResult.allowed).toBe(false)
      // Would not reach role check
    })

    it("stops at governance guard before allowing", () => {
      const ctx: GuardContext = {
        isAuthenticated: true,
        role: "ADMIN",
        governanceStatus: "WalletMismatchLocked",
      }
      const authResult = checkAuthGuard(ctx)
      expect(authResult.allowed).toBe(true)
      // Continue to governance
      const govResult = checkGovernanceGuard(ctx)
      expect(govResult.allowed).toBe(false)
    })
  })
})

describe("URL State Integration", () => {
  it("encodes returnTo path correctly", () => {
    const returnTo = "/elections?status=voting"
    const encoded = encodeURIComponent(returnTo)
    expect(encoded).toBe("%2Felections%3Fstatus%3Dvoting")
  })

  it("decodes returnTo on login redirect", () => {
    const encoded = "%2Felections%3Fstatus%3Dvoting"
    const decoded = decodeURIComponent(encoded)
    expect(decoded).toBe("/elections?status=voting")
  })
})