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
import { motion, type Variants } from "framer-motion"
import { Shield, Vote, BarChart3, Zap, Lock, Globe } from "lucide-react"

import { useAuthStore } from "@/state/auth-store"
import { getRoleHome } from "@/lib/url-state"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

// ─── Feature cards data ───────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    icon: Shield,
    title: "Tamper-Proof Voting",
    description:
      "Every vote is cryptographically sealed on the Ethereum Sepolia chain. Results cannot be altered after finalization.",
  },
  {
    icon: Vote,
    title: "Role-Gated Access",
    description:
      "Election authority, candidates, voters, and observers each have distinct, enforced access surfaces.",
  },
  {
    icon: BarChart3,
    title: "Transparent Results",
    description:
      "Real-time election results with full lineage and rerun history, verifiable against on-chain state.",
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
  useDocumentTitle("DVote — Transparent Blockchain Elections")

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
          {/* Testnet badge */}
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dvote-saffron/30 bg-dvote-saffron-subtle px-3 py-1 text-xs font-semibold text-dvote-saffron-dark mb-6">
              <Zap className="size-3" aria-hidden="true" />
              Ethereum Sepolia Testnet
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

          {/* Tagline */}
          <motion.p
            className="text-xl sm:text-2xl text-muted-foreground font-medium mb-4"
            variants={itemVariants}
          >
            Decentralized Elections on Ethereum
          </motion.p>

          <motion.p
            className="text-base text-muted-foreground max-w-lg mx-auto mb-10"
            variants={itemVariants}
          >
            Connect your wallet to participate in tamper-proof, role-gated elections.
            Every vote is recorded immutably on-chain, ensuring full transparency and verifiability.
          </motion.p>

          {/* CTA block */}
          <motion.div
            className="flex flex-col items-center gap-4"
            variants={itemVariants}
          >
            {!isConnected ? (
              /* Not connected: show RainbowKit ConnectButton */
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
              /* Connected: show proceed to sign in */
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
                  Proceed to Sign In
                </button>
                <p className="text-xs text-muted-foreground">
                  You will be asked to sign a one-time challenge message.
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
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Globe className="size-3.5" aria-hidden="true" />
          <span>DVote · Blockchain Lab EXP-6 · Sepolia Testnet</span>
        </div>
      </footer>
    </div>
  )
}
