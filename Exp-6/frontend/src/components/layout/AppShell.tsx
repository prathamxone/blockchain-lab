/**
 * DVote Frontend — Authenticated Application Shell
 *
 * Main layout for all protected/authenticated pages.
 * Structure:
 *   SkipToContent (a11y)
 *   <TopBar> (sticky, role badge, wallet chip, notification bell)
 *   <div.layout-body>
 *     <Sidebar> (desktop: permanent; mobile: overlay drawer)
 *     <main id="main-content"> (page content via {children})
 *   </div.layout-body>
 *   <Toaster> (sonner toast notifications)
 *
 * CDM-4 (CRITICAL):
 *   When role is null (still loading), render SkeletonShell instead of content.
 *   Protected content MUST NOT flash before guard/role resolution.
 *   Parent route guards (Phase F) enforce session check; this shell enforces
 *   visual skeleton as a secondary safety layer.
 *
 * Responsive breakpoints:
 *   Mobile (<lg):   Sidebar hidden behind overlay; topbar hamburger toggle.
 *   Desktop (≥lg):  Sidebar permanent on left; main content fills remainder.
 *
 * Authority: walkthrough Phase E §1, CDM-4
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

import { SkipToContent } from "@/components/a11y/SkipToContent"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

import type { DVoteRole } from "@/components/layout/Sidebar"
import { useInactivityTimer } from "@/hooks/useInactivityTimer"

// ─── Motion variants ──────────────────────────────────────────────────────────

// Page content fade-slide (applied to main content on route change)
const contentVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

const contentTransition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
}

// Mobile sidebar drawer slide-in
const drawerVariants = {
  initial: { x: "-100%" },
  animate: { x: "0%" },
  exit:    { x: "-100%" },
}

const drawerTransition = {
  type: "spring" as const,
  stiffness: 320,
  damping: 32,
}

// ─── Skeleton shell (CDM-4) ───────────────────────────────────────────────────

function SkeletonShell() {
  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      role="status"
      aria-label="Loading your dashboard..."
      aria-busy="true"
    >
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-64 flex-col border-r border-border bg-card p-4 gap-3">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex-1 flex flex-col gap-0">
        <div className="h-16 border-b border-border bg-card animate-pulse" />
        <div className="flex-1 p-6 space-y-4">
          <SkeletonCard variant="stat" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} variant="card" />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading your dashboard...</span>
    </div>
  )
}

// ─── AppShell component ───────────────────────────────────────────────────────

interface AppShellProps {
  children: React.ReactNode
  /** Resolved user role. null → render SkeletonShell (CDM-4). */
  role: DVoteRole | null
  /** Current route path for sidebar active-link highlighting. */
  activePath?: string
  /** Page title shown in topbar and used for document title. */
  pageTitle?: string
  /** Unread inbox count for notification badge. */
  unreadCount?: number
}

export function AppShell({
  children,
  role,
  activePath = "",
  pageTitle,
  unreadCount = 0,
}: AppShellProps) {
  const [isMobileOpen, setMobileOpen] = useState(false)

  // Phase H (H.6): 30-min idle timeout — wired here so it only runs when
  // user is inside the authenticated shell (role resolved, session confirmed).
  // On expiry: clearSession + redirect to /login?returnTo=<path>
  useInactivityTimer()

  // CDM-4: skeleton guard — show loading shell until role is resolved
  if (role === null) {
    return <SkeletonShell />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Accessibility skip link ────────────────────────────────────── */}
      <SkipToContent />

      {/* ── Desktop Sidebar (permanent, lg+) ──────────────────────────── */}
      <div
        id="app-sidebar"
        className="hidden lg:flex flex-col h-full flex-shrink-0"
        aria-label="Sidebar navigation"
      >
        <Sidebar role={role} activePath={activePath} />
      </div>

      {/* ── Mobile Sidebar Overlay Drawer ─────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              variants={drawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={drawerTransition}
              className="fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden"
            >
              {/* Close button top-right of drawer */}
              <div className="absolute right-2 top-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close navigation menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <Sidebar
                role={role}
                activePath={activePath}
                className="h-full"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main layout column ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* TopBar */}
        <TopBar
          pageTitle={pageTitle}
          role={role}
          unreadCount={unreadCount}
          onMenuClick={() => setMobileOpen((prev) => !prev)}
          isMobileMenuOpen={isMobileOpen}
        />

        {/* Main content with page-level fade transition */}
        <motion.main
          id="main-content"
          tabIndex={-1}
          role="main"
          aria-label="Main content"
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={contentTransition}
          className={cn(
            "flex-1 overflow-y-auto",
            "px-4 py-6 sm:px-6 lg:px-8",
          )}
        >
          {children}
        </motion.main>
      </div>

      {/* Global toast notifications (sonner) */}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
      />
    </div>
  )
}

