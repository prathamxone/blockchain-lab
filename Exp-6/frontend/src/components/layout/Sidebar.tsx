/**
 * DVote Frontend — Role-Aware Sidebar Navigation
 *
 * Rendered ONLY after role is resolved from backend (never on role=null skeleton phase).
 * CDM-4 enforcement: parent AppShell handles the null-role skeleton gating;
 * this component assumes role is already resolved when rendered.
 *
 * Role → visible links mapping:
 *   Owner (Admin/SRO/RO)  → Dashboard, Elections, KYC Queue, Results, Inbox
 *   Voter                 → Dashboard, Elections, My Vote, Results, Inbox, Profile
 *   Candidate             → Dashboard, My Candidacy, Elections, Results, Inbox, Profile
 *   Observer              → Dashboard, Elections, Anomalies, Results, Inbox
 *
 * Route paths are placeholders until Phase F (TanStack Router) wires real routes.
 * Using <a> tags here; replaced with <Link> in Phase F.
 *
 * Authority: FEATURE_FRONTEND §5.1 (route list), walkthrough Phase E §3
 */

import { cn } from "@/lib/utils"
import {
  Home,
  Vote,
  Users,
  BarChart3,
  Bell,
  User,
  Shield,
  Eye,
  FileCheck,
  Award,
} from "lucide-react"

// ─── DVote user roles (matches backend API role strings) ────────────────────
export type DVoteRole = "Owner" | "Voter" | "Candidate" | "Observer"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Badge count (e.g. unread notifications) */
  badge?: number
}

// ─── Role → nav items map ───────────────────────────────────────────────────

function getNavItems(role: DVoteRole): NavItem[] {
  const shared: NavItem[] = [
    { label: "Dashboard",  href: "/dashboard",  icon: Home },
    { label: "Elections",  href: "/elections",  icon: Vote },
    { label: "Results",    href: "/results",    icon: BarChart3 },
    { label: "Inbox",      href: "/inbox",      icon: Bell },
  ]

  switch (role) {
    case "Owner":
      return [
        ...shared,
        { label: "KYC Queue", href: "/owner/kyc-queue", icon: FileCheck },
      ]
    case "Voter":
      return [
        ...shared,
        { label: "My Vote",   href: "/vote",    icon: Award },
        { label: "Profile",   href: "/profile", icon: User },
      ]
    case "Candidate":
      return [
        ...shared,
        { label: "My Candidacy", href: "/candidacy", icon: Shield },
        { label: "Profile",      href: "/profile",   icon: User },
      ]
    case "Observer":
      return [
        ...shared,
        { label: "Anomalies", href: "/observer/anomalies", icon: Eye },
      ]
    default:
      return shared
  }
}

// ─── Role badge chip ────────────────────────────────────────────────────────

const ROLE_STYLES: Record<DVoteRole, string> = {
  Owner:     "bg-dvote-saffron-subtle text-dvote-saffron-dark border-dvote-saffron/30",
  Voter:     "bg-dvote-green-subtle text-dvote-green-dark border-dvote-green/30",
  Candidate: "bg-accent text-accent-foreground border-border",
  Observer:  "bg-muted text-muted-foreground border-border",
}

// ─── Sidebar component ──────────────────────────────────────────────────────

interface SidebarProps {
  role: DVoteRole
  /** Current active route path — used to highlight active link. */
  activePath?: string
  /** Collapsed state for mobile overlay or icon-only mode. */
  collapsed?: boolean
  className?: string
}

export function Sidebar({ role, activePath = "", collapsed = false, className }: SidebarProps) {
  const navItems = getNavItems(role)

  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        "flex flex-col h-full",
        "bg-card border-r border-border",
        collapsed ? "w-16" : "w-64",
        "transition-all duration-200 ease-in-out",
        className,
      )}
    >
      {/* ── Brand + role badge ─────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center gap-2 border-b border-border px-4 py-4",
        collapsed && "justify-center px-2",
      )}>
        <span className="text-lg font-extrabold tracking-tight flex-shrink-0">
          <span className="text-primary">D</span>
          <span className="text-foreground">Vote</span>
        </span>
        {!collapsed && (
          <span className={cn(
            "ml-auto text-xs font-medium px-2 py-0.5 rounded-full border",
            ROLE_STYLES[role],
          )}>
            {role}
          </span>
        )}
      </div>

      {/* ── Nav items ──────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5"
        aria-label={`${role} navigation`}
      >
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const isActive = activePath === href || activePath.startsWith(href + "/")

          return (
            <a
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5",
                "text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon
                className={cn(
                  "flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                  collapsed ? "size-5" : "size-4",
                )}
              />
              {!collapsed && (
                <span className="flex-1">{label}</span>
              )}
              {!collapsed && badge !== undefined && badge > 0 && (
                <span
                  className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                  aria-label={`${badge} unread`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* ── Users count placeholder ────────────────────────────────────── */}
      {!collapsed && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            <span>Connected to Sepolia</span>
          </div>
        </div>
      )}
    </aside>
  )
}
