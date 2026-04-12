/**
 * DVote Frontend — Landing Page (Wallet Connect Entry Point)
 *
 * Route: / (public — no auth required)
 * Layout: PublicShell
 *
 * This page serves as the wallet connection entry point.
 * After successful connection, user is navigated to /login to complete
 * the challenge-sign-verify authentication flow.
 *
 * Connected wallet state is managed by wagmi + RainbowKit.
 * After wallet connects, the page renders a "Sign In" CTA that routes to /login.
 * If wallet is already connected and session is active, route guard
 * redirects to role home (handled in beforeLoad via auth-store.isAuthenticated).
 *
 * Features:
 *   - DVote brand hero with value prop (transparent elections on Ethereum)
 *   - RainbowKit ConnectButton (primary CTA when not connected)
 *   - Post-connect: "Proceed to Sign In" button → /login
 *   - Feature highlights grid (3 cards)
 *   - Sepolia testnet badge (clear testnet context)
 *
 * Authority: walkthrough Phase G §1, FEATURE_FRONTEND §6.1
 */

import { useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { motion } from "framer-motion"
import { Shield, Users, BarChart3, Lock, Globe, CheckCircle } from "lucide-react"

import { useAuthStore } from "@/state/auth-store"
import { getRoleHome } from "@/lib/url-state"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

// ─── Feature cards data ───────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: Shield,
    title: "Secure and Fair Elections",
    description:
      "DVote ensures every vote is unique, verified, and correctly counted. Our system eliminates double-voting, fake voter entries, and ballot manipulation.",
  },
  {
    icon: Users,
    title: "For Every Stakeholder",
    description:
      "Voters, candidates, observers, and election authorities each get a dedicated, role-aware experience — from KYC submission to result declaration.",
  },
  {
    icon: BarChart3,
    title: "Transparent Outcomes",
    description:
      "Results are publicly verifiable with full lineage. Election outcomes — from candidate wins to NOTA-triggered reruns — are immutably declared.",
  },
] as const

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

// ─── LandingPage component ────────────────────────────────────────────────────

export default function LandingPage() {
  // L-F2: Tab title = "DVote - Home" (strict convention: "DVote - PageName")
  useDocumentTitle("DVote - Home")

  const { isConnected } = useAccount()
  const navigate = useNavigate()
  const search = useSearch({ from: "/" })

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  // If already authenticated → redirect to role home immediately
  useEffect(() => {
    if (isAuthenticated && role) {
      void navigate({ to: getRoleHome(role) })
    }
  }, [isAuthenticated, role, navigate])

  // Handler: proceed to login (sign + verify)
  const handleProceedToLogin = () => {
    void navigate({
      to: "/login",
      // Preserve returnTo from landing if set (deep-link flow)
      search: "returnTo" in search ? { returnTo: (search as { returnTo?: string }).returnTo } : {},
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24"
      >
        <motion.div
          className="w-full max-w-2xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero ─────────────────────────────────────────────── */}

          {/* Verified badge */}
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dvote-green/30 bg-dvote-green/5 px-3 py-1 text-xs font-semibold text-dvote-green-dark mb-6">
              <CheckCircle className="size-3" aria-hidden="true" />
              Trusted · Transparent · Decentralized
            </span>
          </motion.div>

          {/* Brand heading */}
          <motion.h1
            className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4"
            variants={itemVariants}
          >
            <span className="text-primary">D</span>
            <span className="text-foreground">Vote</span>
          </motion.h1>

          {/* L-F2 tagline — exact text from walkthrough Policy L-F2 */}
          <motion.p
            className="text-xl sm:text-2xl text-muted-foreground font-medium mb-4"
            variants={itemVariants}
          >
            A Decentralized Serverless Voting System
          </motion.p>

          {/* Mission statement — no technical infra details (L-F2) */}
          <motion.p
            className="text-base text-muted-foreground max-w-lg mx-auto mb-10"
            variants={itemVariants}
          >
            DVote is India&apos;s open, fair election platform — built to eliminate malpractice,
            empower every verified citizen, and ensure that every vote truly counts.
          </motion.p>

          {/* CTA block */}
          <motion.div
            className="flex flex-col items-center gap-4"
            variants={itemVariants}
          >
            {!isConnected ? (
              /* Not connected: primary CTA (L-F2: "Connect Wallet" / "Get Started") */
              <div className="flex flex-col items-center gap-3">
                <ConnectButton
                  accountStatus="address"
                  chainStatus="icon"
                  showBalance={false}
                />
                <p className="text-xs text-muted-foreground">
                  MetaMask · WalletConnect · Rainbow · Coinbase Wallet
                </p>
              </div>
            ) : (
              /* Connected: proceed to sign in */
              <div className="flex flex-col items-center gap-3">
                <ConnectButton
                  accountStatus="address"
                  chainStatus="icon"
                  showBalance={false}
                />
                <button
                  id="proceed-to-signin-btn"
                  type="button"
                  onClick={handleProceedToLogin}
                  className="
                    inline-flex items-center gap-2 rounded-lg
                    bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground
                    shadow-lg shadow-primary/20
                    hover:bg-primary/90 active:scale-[0.98]
                    transition-all duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  "
                >
                  <Lock className="size-4" aria-hidden="true" />
                  Get Started
                </button>
                <p className="text-xs text-muted-foreground">
                  You will sign a message to verify wallet ownership.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* ── Feature Cards ──────────────────────────────────────────────── */}
        <motion.div
          className="w-full max-w-4xl mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 px-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {FEATURE_CARDS.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              className="rounded-xl border border-border bg-card p-6 text-left shadow-sm hover:shadow-md transition-shadow duration-200"
              variants={itemVariants}
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-6 text-center">
        <div className="flex flex-col items-center gap-1">
          {/* L-F2: Full tagline in footer */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span className="text-primary font-bold">D</span>
            <span>Vote</span>
            <span className="text-muted-foreground font-normal">—</span>
            <span className="text-muted-foreground font-normal">A Decentralized Serverless Voting System</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 mt-0.5">
            <Globe className="size-3" aria-hidden="true" />
            <span>Blockchain Lab · EXP-6 · IT Engineering SEM VIII</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
