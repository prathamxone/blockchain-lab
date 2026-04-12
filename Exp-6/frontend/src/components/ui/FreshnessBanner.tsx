/**
 * DVote Frontend — FreshnessBanner Component
 *
 * Renders a persistent top banner when system freshness is stale or degraded.
 * - "fresh"    → renders null (no banner)
 * - "stale"    → amber warning banner (advisory — actions still permitted)
 * - "degraded" → red error banner + retry CTA (CDM-9 — sensitive actions blocked)
 * - null       → renders null (hydrating — no banner yet)
 *
 * IMPORTANT (CDM-9): The banner is the VISUAL layer only.
 * The GATE layer is in useSensitiveActionGate (5s debounce, blocks action buttons).
 *
 * Authority: FEATURE_FRONTEND §6.8, walkthrough Phase J, CDM-9
 */

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FreshnessState } from "@/state/freshness-store"
import { useFreshnessStore } from "@/state/freshness-store"

// ─── Freshness banner config ──────────────────────────────────────────────────

interface BannerConfig {
  icon: React.ReactNode
  title: string
  description: string
  showRetry: boolean
  variant: "warning" | "error"
}

function getBannerConfig(state: FreshnessState): BannerConfig | null {
  switch (state) {
    case "stale":
      return {
        icon: <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />,
        title: "Chain Data Slightly Delayed",
        description:
          "Election data may be up to 2 minutes behind the blockchain. " +
          "Read-only views are available. Sensitive actions remain permitted.",
        showRetry: true,
        variant: "warning",
      }

    case "degraded":
      return {
        icon: <WifiOff className="size-4 shrink-0" aria-hidden="true" />,
        title: "System Sync Degraded — Sensitive Actions Disabled",
        description:
          "The backend has lost sync with the Sepolia blockchain for more than 2 minutes. " +
          "Vote cast, KYC submission, and escalation execution are temporarily disabled " +
          "to protect data integrity. Please wait for the system to resync.",
        showRetry: true,
        variant: "error",
      }

    case "fresh":
    default:
      return null // No banner
  }
}

// ─── Variant styling ──────────────────────────────────────────────────────────

const variantStyles = {
  warning: {
    wrapper: "bg-amber-50 border-amber-300 text-amber-900",
    icon: "text-amber-600",
    retry: "text-amber-700 hover:text-amber-900 border-amber-400 hover:border-amber-600",
  },
  error: {
    wrapper: "bg-destructive/10 border-destructive/30 text-destructive",
    icon: "text-destructive",
    retry: "text-destructive hover:text-destructive/80 border-destructive/40 hover:border-destructive",
  },
} as const

// ─── FreshnessBanner component ────────────────────────────────────────────────

interface FreshnessBannerProps {
  /** Manual freshness state override — if not provided reads from store. */
  freshnessState?: FreshnessState | null
  /** Callback for retry CTA button. If not provided, triggers page focus/refetch. */
  onRetry?: () => void
  className?: string
}

/**
 * System freshness status banner.
 * Renders null when freshnessState is "fresh" or null (not yet fetched).
 * Reads from freshness-store by default; can accept override via prop.
 */
export function FreshnessBanner({
  freshnessState: propState,
  onRetry,
  className,
}: FreshnessBannerProps) {
  // Read from store if no prop override
  const storeState = useFreshnessStore((s) => s.freshnessState)
  const state = propState !== undefined ? propState : storeState

  if (!state || state === "fresh") return null

  const config = getBannerConfig(state)
  if (!config) return null

  const styles = variantStyles[config.variant]

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      // Trigger browser focus event → useFreshness effect re-fetches immediately
      document.dispatchEvent(new Event("visibilitychange"))
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "w-full border rounded-lg px-4 py-3 mb-3",
        "flex flex-col sm:flex-row items-start sm:items-center gap-3",
        styles.wrapper,
        className,
      )}
    >
      {/* Icon */}
      <span className={cn("mt-0.5 sm:mt-0 shrink-0", styles.icon)}>
        {config.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{config.title}</p>
        <p className="text-xs mt-0.5 opacity-85 leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Retry CTA */}
      {config.showRetry && (
        <button
          type="button"
          onClick={handleRetry}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5",
            "text-xs font-medium px-3 py-1.5 rounded-md border transition-colors",
            "bg-transparent hover:bg-white/20",
            styles.retry,
          )}
          aria-label="Retry freshness check"
        >
          <RefreshCw className="size-3" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  )
}
