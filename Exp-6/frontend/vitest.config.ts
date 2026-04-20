/**
 * DVote Frontend — Vitest Configuration
 *
 * Unit and integration test configuration using Vitest.
 * Uses jsdom environment for browser-like testing of React components.
 *
 * Authority: walkthrough Phase V
 */

import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "vite.config.ts",
      ],
    },
    // Timeout for tests (30 seconds)
    testTimeout: 30000,
    // Hook timeout
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})