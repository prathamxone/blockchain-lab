/**
 * DVote Frontend — Playwright Configuration
 *
 * E2E test configuration using Playwright.
 * Tests run against the actual running dev server.
 *
 * Authority: walkthrough Phase V
 */

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 30000,

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Chromium for all tests
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox for cross-browser verification
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    // WebKit for macOS/iOS verification
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})