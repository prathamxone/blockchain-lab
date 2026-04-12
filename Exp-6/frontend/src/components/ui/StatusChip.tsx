/**
 * DVote Frontend — Status Chip Component
 *
 * Renders a semantic status badge/chip for election lifecycle states,
 * KYC submission states, and governance lock states.
 *
 * Uses EXACT backend enum string values as status identifiers.
 * Do NOT infer or derive states from partial data — use what the API sends.
 * Authority: BACKEND_HANDOFF_REPORT §3 (enum contracts), walkthrough Phase E §6
 *
 * Election lifecycle statuses (exact backend enum):
 *   Draft | RegistrationOpen | VotingOpen | VotingClosed | Finalized | Superseded
 *
 * KYC submission statuses:
 *   Pending | UnderReview | Approved | Rejected | ResubmissionRequired
 *
 * Generic semantic statuses:
 *   success | warning | error | info | neutral | loading
 *
 * CDM-2/CDM-3: all colors via semantic token classes — zero direct hex.
 */

import { cn } from "@/lib/utils"

// ─── Election lifecycle union ────────────────────────────────────────────────
type ElectionStatus =
  | "Draft"
  | "RegistrationOpen"
  | "VotingOpen"
  | "VotingClosed"
  | "Finalized"
  | "Superseded"

// ─── KYC status union ────────────────────────────────────────────────────────
type KycStatus =
  | "Pending"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "ResubmissionRequired"

// ─── Generic semantic status ─────────────────────────────────────────────────
type SemanticStatus = "success" | "warning" | "error" | "info" | "neutral" | "loading"

export type StatusChipStatus = ElectionStatus | KycStatus | SemanticStatus

interface StatusChipProps {
  status: StatusChipStatus
  /** Optional override label. Defaults to display-formatted status string. */
  label?: string
  size?: "sm" | "md"
  className?: string
}

// ─── Status → display config map ─────────────────────────────────────────────
interface StatusConfig {
  label: string
  className: string
  dotClassName: string
}

const STATUS_CONFIG: Record<StatusChipStatus, StatusConfig> = {
  // ── Election statuses ──────────────────────────────────────────────────────
  Draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
    dotClassName: "bg-muted-foreground",
  },
  RegistrationOpen: {
    label: "Registration Open",
    className: "bg-[color:var(--color-dvote-info-light)] text-[color:var(--color-dvote-info)] border-[color:var(--color-dvote-info)]/30",
    dotClassName: "bg-[color:var(--color-dvote-info)]",
  },
  VotingOpen: {
    label: "Voting Open",
    className: "bg-dvote-green-subtle text-dvote-green-dark border-dvote-green/30",
    dotClassName: "bg-dvote-green animate-pulse",
  },
  VotingClosed: {
    label: "Voting Closed",
    className: "bg-dvote-saffron-subtle text-dvote-saffron-dark border-dvote-saffron/30",
    dotClassName: "bg-dvote-saffron",
  },
  Finalized: {
    label: "Finalized",
    className: "bg-dvote-green-subtle text-dvote-green-dark border-dvote-green/30",
    dotClassName: "bg-dvote-green-dark",
  },
  Superseded: {
    label: "Superseded",
    className: "bg-muted text-muted-foreground border-border line-through",
    dotClassName: "bg-muted-foreground",
  },

  // ── KYC statuses ───────────────────────────────────────────────────────────
  Pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground border-border",
    dotClassName: "bg-muted-foreground",
  },
  UnderReview: {
    label: "Under Review",
    className: "bg-dvote-saffron-subtle text-dvote-saffron-dark border-dvote-saffron/30",
    dotClassName: "bg-dvote-saffron animate-pulse",
  },
  Approved: {
    label: "Approved",
    className: "bg-dvote-green-subtle text-dvote-green-dark border-dvote-green/30",
    dotClassName: "bg-dvote-green",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-dvote-error-light text-dvote-error border-dvote-error/30",
    dotClassName: "bg-dvote-error",
  },
  ResubmissionRequired: {
    label: "Resubmit Required",
    className: "bg-dvote-warning-light text-dvote-warning border-dvote-warning/30",
    dotClassName: "bg-dvote-warning",
  },

  // ── Generic semantic statuses ──────────────────────────────────────────────
  success: {
    label: "Success",
    className: "bg-dvote-green-subtle text-dvote-green-dark border-dvote-green/30",
    dotClassName: "bg-dvote-green",
  },
  warning: {
    label: "Warning",
    className: "bg-dvote-warning-light text-dvote-warning border-dvote-warning/30",
    dotClassName: "bg-dvote-warning",
  },
  error: {
    label: "Error",
    className: "bg-dvote-error-light text-dvote-error border-dvote-error/30",
    dotClassName: "bg-dvote-error",
  },
  info: {
    label: "Info",
    className: "bg-[color:var(--color-dvote-info-light)] text-[color:var(--color-dvote-info)] border-[color:var(--color-dvote-info)]/30",
    dotClassName: "bg-[color:var(--color-dvote-info)]",
  },
  neutral: {
    label: "Neutral",
    className: "bg-muted text-muted-foreground border-border",
    dotClassName: "bg-muted-foreground",
  },
  loading: {
    label: "Loading",
    className: "bg-muted text-muted-foreground border-border",
    dotClassName: "bg-muted-foreground animate-pulse",
  },
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
}

const dotSizeClasses = {
  sm: "size-1.5",
  md: "size-2",
}

export function StatusChip({
  status,
  label: labelOverride,
  size = "md",
  className,
}: StatusChipProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.neutral
  const displayLabel = labelOverride ?? config.label

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeClasses[size],
        config.className,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("rounded-full flex-shrink-0", dotSizeClasses[size], config.dotClassName)}
      />
      {displayLabel}
    </span>
  )
}
