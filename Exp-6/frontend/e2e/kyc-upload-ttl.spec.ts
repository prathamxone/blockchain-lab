/**
 * E2E: KYC Upload TTL — Authorize → Finalize → 10-minute Expiry
 *
 * @file e2e/kyc-upload-ttl.spec.ts
 */
import { test, expect } from "@playwright/test";

const MOCK_VOTER_SESSION = {
  role: "voter",
  walletAddress: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  token: "mock-voter-token-456",
  kycStatus: "pending",
};

test.describe("KYC Upload TTL Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate((session) => {
      localStorage.setItem("dvote_session", JSON.stringify(session));
    }, MOCK_VOTER_SESSION);
  });

  test("User can initiate upload authorize and receive presigned URL", async ({ page }) => {
    await page.goto("/voter/profile/kyc");

    // Mock authorize endpoint
    await page.route("**/api/uploads/authorize", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadId: "upload_abc123",
          presignedUrl: "https://mock-r2.example.com/upload?token=xyz",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Trigger document upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "aadhaar_front.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-jpeg-data".padEnd(1024, "\0")),
    });

    // Should show upload progress
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });

  test("Upload TTL timer shows 10-minute countdown", async ({ page }) => {
    await page.goto("/voter/profile/kyc");

    // Mock authorize with 10min expiry
    await page.route("**/api/uploads/authorize", (route) => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadId: "upload_abc123",
          presignedUrl: "https://mock-r2.example.com/upload?token=xyz",
          expiresAt,
        }),
      });
    });

    // Trigger upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "aadhaar_front.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-jpeg-data"),
    });

    // Timer badge visible
    const ttlBadge = page.locator('[data-testid="upload-ttl"]');
    await expect(ttlBadge).toBeVisible();
    // Should show countdown
    const ttlText = await ttlBadge.textContent();
    expect(ttlText).toMatch(/\d+:\d+/); // mm:ss format
  });

  test("Upload expires after 10 minutes if not finalized", async ({ page }) => {
    // Simulate expired upload session
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem("dvote_session") || "{}");
      session.uploadDeadline = Date.now() - 1000; // already expired
      localStorage.setItem("dvote_session", JSON.stringify(session));
    });

    await page.goto("/voter/profile/kyc");

    // Should show expired state
    const expiredBanner = page.locator("text=/upload.*expired|session.*expired/i");
    await expect(expiredBanner.first()).toBeVisible();

    // Re-authorize button should appear
    const reauthorizeBtn = page.locator('button:has-text("Start Over"), button:has-text("Re-authorize")');
    await expect(reauthorizeBtn).toBeVisible();
  });

  test("Finalize binds upload to KYC and transitions to pending review", async ({ page }) => {
    await page.goto("/voter/profile/kyc");

    // Mock authorize
    await page.route("**/api/uploads/authorize", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadId: "upload_abc123",
          presignedUrl: "https://mock-r2.example.com/upload?token=xyz",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "aadhaar_front.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-jpeg-data"),
    });

    // Mock finalize
    await page.route("**/api/uploads/finalize", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          kycStatus: "pending_review",
          uploadId: "upload_abc123",
        }),
      });
    });

    // Click finalize
    await page.click('button:has-text("Finalize Upload")');
    await page.waitForResponse("**/api/uploads/finalize**");

    // Should transition to "Pending Review"
    const pendingBadge = page.locator("text=/pending.*review|under review/i");
    await expect(pendingBadge.first()).toBeVisible();
  });

  test("Aadhaar number visible on Review step (L-C2 compliance)", async ({ page }) => {
    await page.goto("/voter/profile/kyc?step=review");

    // Enter Aadhaar
    await page.fill('input[id="kyc-aadhaar"]', "123456789012");

    // On review step, should show masked Aadhaar
    const maskedAadhaar = page.locator('[data-testid="aadhaar-masked"], text=/\d{4}\*+\d{4}/');
    await expect(maskedAadhaar.first()).toBeVisible();

    // Full number should NOT be visible
    const fullAadhaar = page.locator("text=123456789012");
    await expect(fullAadhaar).not.toBeVisible();
  });
});