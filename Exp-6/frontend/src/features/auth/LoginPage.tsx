/**
 * DVote Frontend — Login Page (Challenge → Sign → Verify Flow)
 *
 * Route: /login (public, requires wallet already connected)
 * Layout: PublicShell
 *
 * This page runs AFTER wallet connection (from LandingPage).
 * It orchestrates the challenge → sign → verify auth handshake via useAuth,
 * then restores the returnTo path or navigates to role home.
 *
 * If wallet is not connected, redirects back to / (landing) for reconnect.
 * If already authenticated, redirects to role home (via useEffect guard).
 *
 * CDM-5: ChainMismatchBanner renders ABOVE the sign-in button.
 * The sign-in button is disabled while chain ≠ Sepolia.
 *
 * States rendered:
 *   idle            → "Sign In" button (primary CTA)
 *   requesting-challenge → loading state: "Requesting challenge..."
 *   awaiting-signature   → loading state: "Check your wallet..."
 *   verifying            → loading state: "Verifying..."
 *   fetching-role        → loading state: "Resolving role..."
 *   success              → success (brief, then router navigates)
 *   error                → error message + retry button
 *
 * EOA enforcement: if connector.type is a contract wallet,
 * error message is shown before any challenge is requested.
 *
 * Authority: walkthrough Phase G §2–§5, FEATURE_FRONTEND §6.2
 * Authority: BACKEND_HANDOFF_REPORT §5.3 (auth transport)
 */

import { useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useChainId } from "wagmi"
import { motion, AnimatePresence } from "framer-motion"
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useAuth } from "@/hooks/useAuth"
import { ChainMismatchBanner } from "@/components/auth/ChainMismatchBanner"
import { useAuthStore } from "@/state/auth-store"
import { getRoleHome } from "@/lib/url-state"
import { TARGET_CHAIN_ID, isContractWalletConnector } from "@/config/roles"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

// ─── Step labels for the state machine UI ──────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  "requesting-challenge": "Requesting challenge...",
  "awaiting-signature":   "Check your wallet — approve the signing request",
  "verifying":            "Verifying signature...",
  "fetching-role":        "Resolving your role...",
  "success":              "Signed in successfully!",
}

// ─── LoginPage component ──────────────────────────────────────────────────────

export default function LoginPage() {
  useDocumentTitle("DVote — Sign In")

  const { isConnected, connector } = useAccount()
  const chainId = useChainId()
  const navigate = useNavigate()
  const search = useSearch({ from: "/login" })

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  const { login, step, error, isLoading, reset } = useAuth()

  // Guard: not connected → back to landing
  useEffect(() => {
    if (!isConnected) {
      void navigate({ to: "/" })
    }
  }, [isConnected, navigate])

  // Guard: already authenticated → role home
  useEffect(() => {
    if (isAuthenticated && role) {
      void navigate({ to: getRoleHome(role) })
    }
  }, [isAuthenticated, role, navigate])

  const isOnCorrectChain = chainId === TARGET_CHAIN_ID
  const isContractWallet = isContractWalletConnector(connector?.type)
  const canSignIn = isConnected && isOnCorrectChain && !isContractWallet

  const handleSignIn = () => {
    void login({ returnTo: (search as { returnTo?: string }).returnTo })
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* ── Brand header ────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            <span className="text-primary">D</span>
            <span className="text-foreground">Vote</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Ethereum wallet to continue
          </p>
        </div>

        {/* ── Main card ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card shadow-lg p-6 space-y-5">

          {/* Wallet status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4 flex-shrink-0" aria-hidden="true" />
              <span>Wallet</span>
            </div>
            <ConnectButton
              accountStatus="address"
              chainStatus="none"
              showBalance={false}
            />
          </div>

          {/* CDM-5: Chain mismatch banner — above sign-in button */}
          <ChainMismatchBanner />

          {/* Contract wallet warning */}
          {isContractWallet && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
            >
              <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-destructive" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Smart Wallet Not Supported</p>
                <p className="text-destructive/80 text-xs mt-0.5">
                  DVote MVP supports EOA (Externally Owned Account) wallets only.
                  Please switch to MetaMask, Rainbow, or another standard EOA wallet.
                </p>
              </div>
            </div>
          )}

          {/* ── Auth step state machine ─────────────────────────────────── */}
          <AnimatePresence mode="wait">

            {/* Error state */}
            {step === "error" && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2"
                role="alert"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 flex-shrink-0 text-destructive" aria-hidden="true" />
                  <p className="text-sm font-semibold text-destructive">Sign In Failed</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {error.message}
                </p>
              </motion.div>
            )}

            {/* Success state */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-lg border border-dvote-green/30 bg-dvote-green/10 px-4 py-3"
              >
                <CheckCircle2 className="size-4 flex-shrink-0 text-dvote-green" aria-hidden="true" />
                <p className="text-sm font-semibold text-dvote-green">Signed in — redirecting...</p>
              </motion.div>
            )}

            {/* In-progress state label */}
            {isLoading && STEP_LABELS[step] && (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                aria-live="polite"
                aria-atomic="true"
              >
                <Loader2 className="size-4 animate-spin flex-shrink-0" aria-hidden="true" />
                <span>{STEP_LABELS[step]}</span>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ── Primary action buttons ──────────────────────────────────── */}
          <div className="flex flex-col gap-3 pt-1">
            {step === "error" ? (
              /* Retry button after error */
              <button
                id="login-retry-btn"
                type="button"
                onClick={() => { reset(); handleSignIn() }}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground",
                  "hover:bg-primary/90 transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Try Again
              </button>
            ) : (
              /* Primary sign in button */
              <button
                id="login-signin-btn"
                type="button"
                onClick={handleSignIn}
                disabled={!canSignIn || isLoading || step === "success"}
                aria-disabled={!canSignIn || isLoading || step === "success"}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  canSignIn && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="size-4" aria-hidden="true" />
                )}
                {isLoading ? "Signing in..." : "Sign In with Wallet"}
              </button>
            )}
          </div>

          {/* ── Info footnote ───────────────────────────────────────────── */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
            <Info className="mt-0.5 size-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You will sign a one-time challenge message to prove wallet ownership.
              No transaction or gas fees are involved. Access tokens are kept in memory only.
            </p>
          </div>
        </div>

        {/* ── Back link ──────────────────────────────────────────────────── */}
        <div className="mt-4 text-center">
          <button
            id="login-back-btn"
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Back to home
          </button>
        </div>
      </motion.div>
    </div>
  )
}
