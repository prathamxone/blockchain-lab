/**
 * DVote Frontend — Environment Variable Parser
 *
 * Typed, fail-fast parser for all VITE_ environment variables.
 * Any missing required key causes an immediate runtime error on app startup,
 * preventing silent misconfigurations from reaching users.
 *
 * Authority: EXP-6_FRONTEND_PLAN Phase 3 + BACKEND_HANDOFF_REPORT §5.3
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key]
  if (!value || value.trim() === "") {
    throw new Error(
      `[DVote] Missing required environment variable: ${key}\n` +
        `Check frontend/.env.local and ensure this key is set.`,
    )
  }
  return value.trim()
}

function optionalEnv(key: string, fallback: string): string {
  const value = import.meta.env[key]
  return value && value.trim() !== "" ? value.trim() : fallback
}

// ─── Parsed and validated env contract ────────────────────────────────────────

export const env = {
  /**
   * Backend API base URL.
   * Dev default: http://localhost:4000
   * Preview: https://dvote-backend.vercel.app (set in .env.local)
   */
  apiBaseUrl: requireEnv("VITE_API_BASE_URL"),

  /**
   * WalletConnect Cloud project ID.
   * Required for WalletConnect connector to initialize.
   * Obtain from: https://cloud.walletconnect.com/
   */
  walletConnectProjectId: requireEnv("VITE_APP_WALLETCONNECT_PROJECT_ID"),

  /**
   * Target EVM chain ID. DVote MVP targets Sepolia (11155111).
   */
  chainId: parseInt(optionalEnv("VITE_CHAIN_ID", "11155111"), 10),

  /**
   * Application version string.
   * Used as part of tutorial persistence key: wallet + role + appVersion
   */
  appVersion: optionalEnv("VITE_APP_VERSION", "0.1.0"),
} as const

export type Env = typeof env
