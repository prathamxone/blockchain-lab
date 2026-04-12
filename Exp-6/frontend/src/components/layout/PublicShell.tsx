/**
 * DVote Frontend — Public Shell Layout
 *
 * Wrapper for public/unauthenticated pages: Landing, Login.
 * No sidebar, no authentication required.
 *
 * Structure:
 *   SkipToContent (a11y)
 *   <header> — DVote wordmark + "Connect Wallet" CTA (Phase G wires real connector)
 *   <main id="main-content"> — page content slot via {children}
 *   <footer> — minimal branding footer
 *
 * The ConnectButton from RainbowKit is rendered as a placeholder; actual
 * wallet connector logic is wired in Phase G.
 *
 * Tab title is set by individual page components via useDocumentTitle().
 *
 * Authority: walkthrough Phase E §2, L-F2 (landing page), CDM-4
 *
 * Responsive: full-width fluid layout, max-w-7xl centered content.
 */

import { motion } from "framer-motion"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { SkipToContent } from "@/components/a11y/SkipToContent"
import { cn } from "@/lib/utils"

// ─── Page-level fade-in animation ────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

const pageTransition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number], // ease-in-out
}

interface PublicShellProps {
  children: React.ReactNode
  /** Additional classes on the outer wrapper. */
  className?: string
}

export function PublicShell({ children, className }: PublicShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col",
        "bg-background text-foreground",
        className,
      )}
    >
      {/* a11y: skip link — first focusable element */}
      <SkipToContent />

      {/* ── Public Header ────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-sm"
        role="banner"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Wordmark */}
          <a
            href="/"
            aria-label="DVote — Go to homepage"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          >
            {/* Tri-color wordmark: D (saffron) + Vote (near-black) */}
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-primary">D</span>
              <span className="text-foreground">Vote</span>
            </span>
            <span className="sr-only">DVote — A Decentralized Serverless Voting System</span>
          </a>

          {/* Wallet connect button — Phase G wires full auth flow */}
          <nav aria-label="Main navigation">
            <ConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="avatar"
            />
          </nav>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <motion.main
        id="main-content"
        tabIndex={-1}
        role="main"
        aria-label="Main content"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="flex-1 w-full"
      >
        {children}
      </motion.main>

      {/* ── Minimal Footer ───────────────────────────────────────────────── */}
      <footer
        role="contentinfo"
        className="border-t border-border bg-card py-6"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}{" "}
            <span className="font-medium text-foreground">DVote</span>
            {" "}— A Decentralized Serverless Voting System.
            Built for transparency and trust.
          </p>
        </div>
      </footer>
    </div>
  )
}
