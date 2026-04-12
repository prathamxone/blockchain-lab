/**
 * DVote Frontend — Authenticated App TopBar
 *
 * Shown at the top of the authenticated shell (AppShell).
 * Contains:
 *   - Mobile menu toggle (hamburger for sidebar on mobile)
 *   - Page title slot (passed from each page)
 *   - RainbowKit wallet status chip (connected address + network)
 *   - Role badge (resolved by backend — never derived client-side)
 *   - Notification bell with unread count badge
 *   - User avatar / profile link
 *
 * Chain mismatch warning is rendered in Phase G (CDM-5).
 * Wallet governance lock banner is rendered in Phase I.
 *
 * Authority: walkthrough Phase E §4
 * CDM-4: TopBar renders with skeleton until role is resolved (handled by parent AppShell).
 */

import { Bell, Menu } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── Role badge styles ───────────────────────────────────────────────────────
const ROLE_BADGE_STYLES: Record<DVoteRole, string> = {
  Owner:     "bg-dvote-saffron-subtle text-dvote-saffron-dark border-dvote-saffron/40",
  Voter:     "bg-dvote-green-subtle text-dvote-green-dark border-dvote-green/40",
  Candidate: "bg-accent text-accent-foreground border-border",
  Observer:  "bg-muted text-muted-foreground border-border",
}

interface TopBarProps {
  /** Page title shown in the center/left of the topbar. */
  pageTitle?: string
  /** Resolved user role (null while loading — skeleton state). */
  role: DVoteRole | null
  /** Unread notification count. */
  unreadCount?: number
  /** Mobile sidebar toggle handler. */
  onMenuClick?: () => void
  /** Whether the sidebar is currently open on mobile. */
  isMobileMenuOpen?: boolean
  className?: string
}

export function TopBar({
  pageTitle,
  role,
  unreadCount = 0,
  onMenuClick,
  isMobileMenuOpen = false,
  className,
}: TopBarProps) {
  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-3",
        "border-b border-border bg-card/90 backdrop-blur-sm px-4",
        className,
      )}
    >
      {/* ── Mobile menu toggle ──────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isMobileMenuOpen}
        aria-controls="app-sidebar"
        onClick={onMenuClick}
        className="lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      {/* ── Page title ────────────────────────────────────────────────────── */}
      {pageTitle && (
        <h1 className="text-base font-semibold text-foreground truncate flex-1 min-w-0">
          {pageTitle}
        </h1>
      )}
      {!pageTitle && <div className="flex-1" aria-hidden="true" />}

      {/* ── Right-side controls ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-auto">

        {/* Role badge — only when role is resolved */}
        {role && (
          <span
            className={cn(
              "hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5",
              "text-xs font-medium",
              ROLE_BADGE_STYLES[role],
            )}
            aria-label={`Your role: ${role}`}
          >
            {role}
          </span>
        )}

        {/* Notification bell */}
        <a
          href="/inbox"
          aria-label={
            unreadCount > 0
              ? `Inbox — ${unreadCount} unread notifications`
              : "Inbox — no unread notifications"
          }
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-lg",
            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute -right-0.5 -top-0.5",
                "inline-flex min-w-4 h-4 items-center justify-center rounded-full px-1",
                "bg-primary text-[10px] font-bold text-primary-foreground",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </a>

        {/* Wallet chip — RainbowKit renders address + network switcher */}
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus="avatar"
        />
      </div>
    </header>
  )
}
