/**
 * E2E: Role-based Routing
 *
 * Validates deep-link role routes, redirect flows, and guard enforcement.
 *
 * @file e2e/role-routing.spec.ts
 */
import { test, expect } from "@playwright/test";

// --- Role Home Routes ---
const ROLE_HOMES = {
  owner: "/admin",
  observer: "/observer",
  voter: "/voter",
  candidate: "/voter", // candidates share voter home
};

test.describe("Role Routing", () => {
  test("Owner deep-link resolves to /admin", async ({ page }) => {
    await page.goto("/admin");
    // No redirect, stays on admin
    await expect(page).toHaveURL(/\/admin/);
  });

  test("Observer deep-link resolves to /observer", async ({ page }) => {
    await page.goto("/observer");
    await expect(page).toHaveURL(/\/observer/);
  });

  test("Voter deep-link resolves to /voter", async ({ page }) => {
    await page.goto("/voter");
    await expect(page).toHaveURL(/\/voter/);
  });

  // --- Guard Enforcement ---

  test("Unauthenticated user redirected to /", async ({ page }) => {
    // Clear any existing session
    await page.evaluate(() => localStorage.clear());
    await page.goto("/admin");
    // Guard redirects to home
    await expect(page).toHaveURL(/\/$|\/login/);
  });

  test("Voter accessing /admin redirects to /voter", async ({ page }) => {
    // Simulate voter session with role=voter
    await page.evaluate(() => {
      localStorage.setItem(
        "dvote_session",
        JSON.stringify({
          role: "voter",
          walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD73",
          token: "mock-voter-token",
        })
      );
    });
    await page.goto("/admin");
    // Redirected to voter home
    await expect(page).toHaveURL(/\/voter/);
  });

  test("Observer accessing /admin redirects to /observer", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "dvote_session",
        JSON.stringify({
          role: "observer",
          walletAddress: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
          token: "mock-observer-token",
        })
      );
    });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/observer/);
  });

  test("Owner accessing /voter redirects to /admin", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "dvote_session",
        JSON.stringify({
          role: "owner",
          walletAddress: "0xdD2FD4581271e230360230F9337B5A9032e9d3f4",
          token: "mock-owner-token",
        })
      );
    });
    await page.goto("/voter");
    await expect(page).toHaveURL(/\/admin/);
  });

  // --- Return-To Flow ---

  test("Redirect to intended page after login", async ({ page }) => {
    // Navigate to protected page while unauthenticated
    await page.goto("/voter");
    // Should land on home/login
    const redirectedUrl = page.url();
    expect(redirectedUrl).toMatch(/\/$|\/login/);

    // After "login" (mocked), should redirect back
    // This would require actual wallet connection mocking
    // Placeholder: verify returnTo param preservation
    await page.goto("/voter?returnTo=/voter/elections");
    // Guard should preserve returnTo
    await expect(page).toHaveURL(/returnTo=.*voter/);
  });
});