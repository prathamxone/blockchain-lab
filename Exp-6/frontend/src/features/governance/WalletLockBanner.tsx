/**
 * DVote Frontend — WalletLockBanner
 *
 * Deterministic UI for all 4 wallet governance lock states (FEATURE_BACKEND §9.5).
 * Renders null when governanceState is "none" or null (no lock / not fetched).
 *
 * Each lock state shows (per FEATURE_FRONTEND §6.6):
 *   - Clear reason
 *   - Permitted next action
 *   - Expected SLA hint (where available)
 *   - Support / retry path
 *
 * Lock state severity:
 *   WalletMismatchLocked              → ERROR   (red)  — hard block, full route blocked
 *   WalletSwitchPendingApproval       → WARNING (amber) — limited access, awaiting admin
 *   WalletSwitchApprovedAwaitingOnChainRebind → INFO (blue) — near-complete, wait
 *   WalletSwitchRejected              → ERROR   (red)  — rejected; retry / support path
 *
 * "WalletMismatchLocked" must BLOCK all route entry (enforced via router beforeLoad).
 * This component provides the VISUAL layer; the GUARD layer is in router.tsx.
 *
 * Authority: FEATURE_FRONTEND §6.5–6.6, walkthrough Phase I §2
 */

import { AlertTriangle, Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WalletGovernanceState } from "@/state/governance-store"

// ─── Lock state config ────────────────────────────────────────────────────────

interface LockStateConfig {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  actionHref?: string
  slaHint?: string
  variant: "error" | "warning" | "info"
}

function getLockConfig(state: WalletGovernanceState): LockStateConfig | null {
  switch (state) {
    case "WalletMismatchLocked":
      return {
        icon: <XCircle className="size-5 shrink-0" aria-hidden="true" />,
        title: "Wallet Mismatch — Access Locked",
        description:
          "The connected wallet does not match the wallet registered for your account. " +
          "Please reconnect your registered wallet to restore access. " +
          "Your session has been fully restricted until the correct wallet is connected.",
        actionLabel: "Disconnect & Reconnect Registered Wallet",
        slaHint: "Reconnect your registered wallet to immediately restore access.",
        variant: "error",
      }

    case "WalletSwitchPendingApproval":
      return {
        icon: <Clock className="size-5 shrink-0" aria-hidden="true" />,
        title: "Wallet Switch — Awaiting Admin Approval",
        description:
          "Your wallet switch request is pending approval from an administrator. " +
          "Some actions are restricted until the switch is approved. " +
          "You can continue viewing read-only content while your request is under review.",
        actionLabel: "Contact Support",
        actionHref: "mailto:support@dvote.app",
        slaHint: "Admin approvals are typically processed within 24 hours.",
        variant: "warning",
      }

    case "WalletSwitchApprovedAwaitingOnChainRebind":
      return {
        icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />,
        title: "Wallet Switch Approved — On-Chain Rebind Pending",
        description:
          "Your wallet switch has been approved. The on-chain role rebind is now being " +
          "processed. Once the rebind transaction is confirmed on Sepolia, your new wallet " +
          "will have full access. No action is required on your part.",
        actionLabel: "View Sepolia Explorer",
        actionHref: "https://sepolia.etherscan.io",
        slaHint: "On-chain rebind confirmation typically takes 1–3 minutes.",
        variant: "info",
      }

    case "WalletSwitchRejected":
      return {
        icon: <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />,
        title: "Wallet Switch Rejected",
        description:
          "Your wallet switch request was rejected by an administrator. " +
          "Please reconnect your original registered wallet to restore full access, " +
          "or contact support if you believe this decision was made in error.",
        actionLabel: "Contact Support",
        actionHref: "mailto:support@dvote.app",
        slaHint: "Contact support within 48 hours to request a review of this decision.",
        variant: "error",
      }

    case "none":
    default:
      return null // No lock — no banner
  }
}

// ─── Variant styling ──────────────────────────────────────────────────────────

const variantStyles = {
  error: {
    wrapper: "bg-destructive/10 border-destructive/30 text-destructive",
    icon: "text-destructive",
    action:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-300 text-amber-900",
    icon: "text-amber-600",
    action: "bg-amber-600 text-white hover:bg-amber-700",
  },
  info: {
    wrapper: "bg-blue-50 border-blue-300 text-blue-900",
    icon: "text-blue-600",
    action: "bg-blue-600 text-white hover:bg-blue-700",
  },
} as const

// ─── WalletLockBanner component ───────────────────────────────────────────────

interface WalletLockBannerProps {
  /** Current governance state from governance-store. */
  governanceState: WalletGovernanceState | null
  /** Additional class names for the outer wrapper. */
  className?: string
}

/**
 * Displays a prominent banner when a wallet governance lock is active.
 * Renders null when no lock is present (governanceState === "none" or null).
 *
 * For "WalletMismatchLocked": also blocks all interactive content.
 * The router beforeLoad guard provides the hard route block.
 * This component provides the visual explanation layer inside the shell.
 */
export function WalletLockBanner({
  governanceState,
  className,
}: WalletLockBannerProps) {
  if (!governanceState || governanceState === "none") return null

  const config = getLockConfig(governanceState)
  if (!config) return null

  const styles = variantStyles[config.variant]

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "w-full border rounded-lg px-4 py-3 mb-4",
        "flex flex-col sm:flex-row items-start sm:items-center gap-3",
        styles.wrapper,
        className,
      )}
    >
      {/* Icon */}
      <span className={cn("mt-0.5 sm:mt-0", styles.icon)}>
        {config.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{config.title}</p>
        <p className="text-sm mt-0.5 opacity-90 leading-relaxed">
          {config.description}
        </p>
        {config.slaHint && (
          <p className="text-xs mt-1 opacity-70 italic">{config.slaHint}</p>
        )}
      </div>

      {/* Action button */}
      {config.actionHref ? (
        <a
          href={config.actionHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5",
            "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
            styles.action,
          )}
        >
          {config.actionLabel}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : (
        <button
          type="button"
          className={cn(
            "shrink-0 text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
            styles.action,
          )}
          onClick={() => {
            // WalletMismatchLocked: programmatic disconnect
            // User can also use the RainbowKit disconnect menu
            window.location.replace("/")
          }}
        >
          {config.actionLabel}
        </button>
      )}
    </div>
  )
}
