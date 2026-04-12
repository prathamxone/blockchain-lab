/**
 * DVote Frontend — useAuth Hook
 *
 * Orchestrates the complete wallet challenge-sign-verify authentication flow:
 *
 * Flow:
 *   1. Validate preconditions:
 *      a. Wallet connected (isConnected)
 *      b. Correct chain (chainId === TARGET_CHAIN_ID) — CDM-5
 *      c. EOA-only check (connector.type not in CONTRACT_WALLET_CONNECTOR_TYPES)
 *   2. POST /api/v1/auth/challenge → receive nonce message
 *   3. wallet.signMessage(message) → hex signature
 *   4. POST /api/v1/auth/verify { walletAddress, signature } → access token + cookies
 *   5. GET /api/v1/auth/me (Bearer access token) → resolve role, sessionId
 *   6. setSession({ accessToken, sessionId, role, walletAddress })
 *   7. Navigate to returnTo path or role home
 *
 * Security contracts:
 *   - Access token stored ONLY in Zustand store (in-memory) — never localStorage
 *   - Role NEVER comes from JWT decode — always from GET /auth/me body
 *   - Challenge/verify locked to EOA wallets only (CDM-5)
 *   - 5 failed attempts → 15-min lock (backend enforced; frontend shows generic error)
 *
 * Failure handling:
 *   - USER_REJECTED: user rejected signature in wallet → clear, no retry spam
 *   - CHALLENGE_EXPIRED: nonce expired → restart challenge (auto-retry once)
 *   - RATE_LIMITED: challenge lock → show wait messaging
 *   - CONTRACT_WALLET: show EOA guidance, block flow
 *   - CHAIN_MISMATCH: show network switch guidance, block flow
 *
 * Authority: FEATURE_FRONTEND §6.2, walkthrough Phase G §3
 * Authority: BACKEND_HANDOFF_REPORT §5.1–5.3 (auth transport contract)
 */

import { useState, useCallback } from "react"
import { useAccount, useSignMessage, useChainId } from "wagmi"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/state/auth-store"
import { mapBackendRole, TARGET_CHAIN_ID, isContractWalletConnector } from "@/config/roles"
import { getRoleHome } from "@/lib/url-state"

// ─── Auth hook state ──────────────────────────────────────────────────────────

export type AuthStep =
  | "idle"
  | "requesting-challenge"
  | "awaiting-signature"
  | "verifying"
  | "fetching-role"
  | "success"
  | "error"

export interface AuthError {
  code:
    | "CHAIN_MISMATCH"
    | "CONTRACT_WALLET"
    | "USER_REJECTED"
    | "CHALLENGE_EXPIRED"
    | "CHALLENGE_FAILED"
    | "SIGN_FAILED"
    | "VERIFY_FAILED"
    | "ROLE_FETCH_FAILED"
    | "RATE_LIMITED"
    | "UNKNOWN"
  message: string
}

interface UseAuthReturn {
  /** Run the full challenge → sign → verify → role-resolve flow. */
  login: (opts?: { returnTo?: string }) => Promise<void>
  /** Clears all auth state (Zustand + wallet session context). */
  logout: () => Promise<void>
  /** Current step in the auth flow (for UI state machine). */
  step: AuthStep
  /** Last auth error — null if none. */
  error: AuthError | null
  /** True while any auth step is in progress. */
  isLoading: boolean
  /** Reset error and step back to idle. */
  reset: () => void
}

// ─── Challenge API shape ──────────────────────────────────────────────────────
// Mirrors backend auth/routes.ts challengeSchema and sendSuccess response.

interface ChallengeResponse {
  challengeId: string  // UUID — REQUIRED for verify step
  message: string      // canonical SIWE message to sign
  nonce: string
  issuedAt: string     // ISO-8601
  expiresAt: string    // ISO-8601 — for display only (backend enforces TTL)
}

// Mirrors backend verifySchema response:
// { accessToken, csrfToken, user: { wallet, role }, session: { sessionId, expiresAt } }
interface VerifyResponse {
  accessToken: string
  csrfToken: string
  user: {
    wallet: string
    role: string
  }
  session: {
    sessionId: string
    expiresAt: string
  }
}

// Mirrors backend GET /auth/me response:
// { wallet, role, sessionId, sessionExpiresAt }
interface AuthMeResponse {
  wallet: string       // NOTE: backend uses 'wallet' not 'walletAddress'
  role: string         // Backend enum: ADMIN | ECI | SRO | RO | OBSERVER | VOTER
  sessionId: string
  sessionExpiresAt: string | null
}

// ─── useAuth hook ─────────────────────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const navigate = useNavigate()

  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  const [step, setStep] = useState<AuthStep>("idle")
  const [error, setError] = useState<AuthError | null>(null)

  const reset = useCallback(() => {
    setStep("idle")
    setError(null)
  }, [])

  // ── login ──────────────────────────────────────────────────────────────────

  const login = useCallback(
    async ({ returnTo }: { returnTo?: string } = {}) => {
      setError(null)

      // ── Precondition 1: wallet connected ────────────────────────────────────
      if (!isConnected || !address) {
        setError({
          code: "UNKNOWN",
          message: "No wallet connected. Please connect your wallet first.",
        })
        return
      }

      // ── Precondition 2: Correct chain (CDM-5) ─────────────────────────────
      if (chainId !== TARGET_CHAIN_ID) {
        setError({
          code: "CHAIN_MISMATCH",
          message: "Please switch to the Sepolia testnet before signing in.",
        })
        return
      }

      // ── Precondition 3: EOA-only (contract wallet block) ───────────────────
      if (isContractWalletConnector(connector?.type)) {
        setError({
          code: "CONTRACT_WALLET",
          message:
            "Smart contract wallets (e.g., Gnosis Safe) are not supported for login in DVote MVP. " +
            "Please use a standard EOA wallet (MetaMask, Rainbow, WalletConnect with EOA).",
        })
        return
      }

      try {
        // ── Step 1: Fetch challenge message ──────────────────────────────────
        setStep("requesting-challenge")
        // BUG-FIX: backend schema uses 'wallet' + required 'chainId', not 'walletAddress'
        const challengeData = await apiClient.post<ChallengeResponse>(
          "/auth/challenge",
          { wallet: address, chainId },
          { skipAuth: true },
        )
        const { message: challengeMessage, challengeId } = challengeData

        // ── Step 2: Sign message with connected wallet ───────────────────────
        // EOA personal_sign — user approves in wallet UI
        setStep("awaiting-signature")
        let signature: string
        try {
          signature = await signMessageAsync({ message: challengeMessage })
        } catch (signErr: unknown) {
          // Wallet rejected (user dismissed popup)
          const isUserRejection =
            signErr instanceof Error &&
            (signErr.message.includes("rejected") ||
              signErr.message.includes("denied") ||
              signErr.message.includes("cancelled") ||
              signErr.message.toLowerCase().includes("user rejected"))

          setError({
            code: isUserRejection ? "USER_REJECTED" : "SIGN_FAILED",
            message: isUserRejection
              ? "Signature declined. Please approve the signing request in your wallet to continue."
              : "Wallet signing failed. Please try again.",
          })
          setStep("error")
          return
        }

        // ── Step 3: Verify signature → get access token + set cookies ────────
        setStep("verifying")
        let verifyData: VerifyResponse
        try {
          // BUG-FIX: backend verifySchema requires {wallet, chainId, challengeId, signature}
          // was: { walletAddress, signature } — missing required chainId + challengeId
          verifyData = await apiClient.post<VerifyResponse>("/auth/verify", {
            wallet: address,
            chainId,
            challengeId,
            signature,
          })
        } catch (verifyErr: unknown) {
          // Surface challenge expiry vs generic verify failure
          const errMessage =
            verifyErr instanceof Error ? verifyErr.message : String(verifyErr)
          const isChallengeExpired =
            errMessage.includes("CHALLENGE_EXPIRED") ||
            errMessage.includes("expired")

          setError({
            code: isChallengeExpired ? "CHALLENGE_EXPIRED" : "VERIFY_FAILED",
            message: isChallengeExpired
              ? "The login challenge has expired. Please try signing in again."
              : "Signature verification failed. Please try again.",
          })
          setStep("error")
          return
        }

        const { accessToken } = verifyData
        // BUG-FIX: sessionId lives in verifyData.session.sessionId, not at top level
        const { sessionId } = verifyData.session

        // ── Step 4: Resolve role from GET /auth/me ───────────────────────────
        // CRITICAL: NEVER read role from JWT payload — always from /auth/me body.
        setStep("fetching-role")
        let meData: AuthMeResponse
        try {
          meData = await apiClient.get<AuthMeResponse>("/auth/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        } catch {
          setError({
            code: "ROLE_FETCH_FAILED",
            message: "Session established but role resolution failed. Please try again.",
          })
          setStep("error")
          return
        }

        const frontendRole = mapBackendRole(meData.role)
        if (!frontendRole) {
          setError({
            code: "ROLE_FETCH_FAILED",
            message: `Unrecognized role "${meData.role}" returned by backend. Please contact your system administrator.`,
          })
          setStep("error")
          return
        }

        // ── Step 5: Store session in memory (L-B1 — never localStorage) ──────
        setSession({
          accessToken,
          sessionId,
          role: frontendRole,
          // BUG-FIX: backend /auth/me returns 'wallet' not 'walletAddress'
          walletAddress: meData.wallet,
        })
        setHydrated()
        setStep("success")
        toast.success(`Signed in as ${frontendRole}`)

        // ── Step 6: Navigate to returnTo or role home ─────────────────────────
        const destination = returnTo ?? getRoleHome(frontendRole)
        void navigate({ to: destination })
      } catch (err: unknown) {
        // Catch-all for unexpected failures
        const isRateLimit =
          err instanceof Error && err.message.includes("RATE_LIMITED")
        setError({
          code: isRateLimit ? "RATE_LIMITED" : "UNKNOWN",
          message: isRateLimit
            ? "Too many sign-in attempts. Please wait 15 minutes before trying again."
            : "An unexpected error occurred. Please try again.",
        })
        setStep("error")
      }
    },
    [
      isConnected,
      address,
      chainId,
      connector,
      signMessageAsync,
      navigate,
      setSession,
      setHydrated,
    ],
  )

  // ── logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      // Attempt server-side session revocation (includes CSRF header).
      // This is best-effort — still clear local state even if request fails.
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("dvote_csrf_token="))
        ?.split("=")[1]

      await apiClient.post("/auth/logout", {}, {
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      }).catch(() => {
        // Silent — local clear proceeds regardless
      })
    } finally {
      // L-B1: clear in-memory token — ALWAYS executes
      clearSession()
      toast.success("Signed out successfully.")
      void navigate({ to: "/" })
    }
  }, [clearSession, navigate])

  return {
    login,
    logout,
    step,
    error,
    isLoading: step !== "idle" && step !== "success" && step !== "error",
    reset,
  }
}

