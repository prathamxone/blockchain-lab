/**
 * E2E: Vote Flow — Token Lifecycle, Casting, and 60s TTL Expiry
 *
 * @file e2e/vote-flow.spec.ts
 */
import { test, expect } from "@playwright/test";

const MOCK_VOTER_SESSION = {
  role: "voter",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD73",
  token: "mock-voter-token-123",
  kycStatus: "approved",
};

test.describe("Vote Flow — State Machine", () => {
  test.beforeEach(async ({ page }) => {
    // Set authenticated voter session
    await page.evaluate((session) => {
      localStorage.setItem("dvote_session", JSON.stringify(session));
    }, MOCK_VOTER_SESSION);
  });

  test("Voter can navigate to election and request intent", async ({ page }) => {
    await page.goto("/voter");
    // Navigate to elections list
    await page.click('a[href*="elections"]');
    await expect(page).toHaveURL(/elections/);

    // Click on an active election
    const activeElection = page.locator('[data-state="active"]').first();
    await activeElection.click();

    // Should see "Cast Vote" or "Request Intent" button
    const intentButton = page.locator("button:has-text('Request Intent'), button:has-text('Cast Vote')");
    await expect(intentButton).toBeVisible();
  });

  test("Vote token expires after 60s TTL", async ({ page }) => {
    await page.goto("/voter/elections/active-1");
    // Request intent
    await page.click('button:has-text("Request Intent")');
    await page.waitForResponse("**/api/votes/intent**");

    // Token badge shows countdown
    const timerBadge = page.locator('[data-testid="vote-timer"]');
    await expect(timerBadge).toBeVisible();

    // Fast-forward via clock manipulation (if supported) or wait 60s
    // For CI, we mock the clock via injected script
    await page.evaluate(() => {
      // Simulate 61s elapsed
      const session = JSON.parse(localStorage.getItem("dvote_session") || "{}");
      session.voteTokenExpiry = Date.now() - 1000; // already expired
      localStorage.setItem("dvote_session", JSON.stringify(session));
    });

    // Refresh page — token should be invalid
    await page.reload();
    // Should see "Token Expired" or redirect to re-request
    const expiredMessage = page.locator("text=/expired|invalid|re-request/i");
    await expect(expiredMessage.first()).toBeVisible();
  });

  test("Cannot cast vote twice with same token", async ({ page }) => {
    await page.goto("/voter/elections/active-1");

    // Request intent
    await page.click('button:has-text("Request Intent")');
    await page.waitForResponse("**/api/votes/intent**");

    // First cast
    await page.click('button:has-text("Confirm Vote")');
    await page.waitForResponse("**/api/votes/cast**");

    // Try to cast again
    await page.reload();
    // Should NOT allow re-cast — button should be disabled or show "Already Cast"
    const castButton = page.locator("button:has-text('Confirm Vote'), button:has-text('Cast Vote')");
    // Either disabled or replaced with "Already Voted"
    const isDisabled = await castButton.isDisabled().catch(() => false);
    const alreadyVoted = page.locator("text=/already.*voted|cast.*completed/i");
    expect(isDisabled || (await alreadyVoted.isVisible().catch(() => false))).toBeTruthy();
  });

  test("Vote confirmation shows transaction hash", async ({ page }) => {
    await page.goto("/voter/elections/active-1");

    // Mock successful cast response
    await page.route("**/api/votes/cast", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          state: "confirmed",
        }),
      });
    });

    await page.click('button:has-text("Request Intent")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Confirm Vote")');
    await page.waitForResponse("**/api/votes/cast**");

    // Should show tx hash
    const txHash = page.locator('[data-testid="tx-hash"], code:has-text("0x1234")');
    await expect(txHash.first()).toBeVisible();
  });
});