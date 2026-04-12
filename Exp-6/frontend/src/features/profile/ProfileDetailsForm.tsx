/**
 * DVote Frontend — ProfileDetailsForm Component
 *
 * Displays the authenticated user's identity summary derived from
 * the auth store (wallet, role) and KYC data (masked Aadhaar, EPIC,
 * submission state, participant type).
 *
 * This is a READ-ONLY display surface for Phase M.
 * Write actions (editing name, address) are deferred to Phase M+.
 *
 * L-C2 Aadhaar masking rule:
 *   Aadhaar is NEVER displayed in clear-text on profile surfaces.
 *   Only the masked XXXX-XXXX-1234 form is shown. This matches the
 *   identical rule enforced on KycStepReview.
 *
 * EPIC is shown in full (official voter ID is not a high-risk secret
 * in this context per FEATURE_FRONTEND §6.5 and walkthrough phase K).
 *
 * Role badge colors mirror the Sidebar ROLE_STYLES palette for visual
 * consistency.
 *
 * KYC status badges reuse kycStatusLabel + kycStatusColor from mask.ts.
 *
 * Authority: walkthrough Phase M, FEATURE_FRONTEND §7.3, L-C2, Plan Phase 13
 */

import { ShieldCheck, Wallet, UserCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { maskAadhaar, kycStatusLabel, kycStatusVariant, type KycStatus } from "@/lib/format/mask"
import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KycSummaryData {
  submissionId: string | null
  state: KycStatus | null
  submittedAt: string | null
  isAadhaarOnly: boolean
  /** Raw or canonical Aadhaar — will be masked before display */
  aadhaar?: string
  /** EPIC voter ID — displayed in full */
  epic?: string
  participantType?: "VOTER" | "CANDIDATE"
}

export interface ProfileDetailsFormProps {
  walletAddress: string
  role: DVoteRole
  kycData: KycSummaryData | null
  /** True while GET /kyc/me is loading */
  isLoading?: boolean
  /** Error from GET /kyc/me fetch */
  fetchError?: string | null
  /** electionId for KYC context label */
  electionId?: string | null
}

// ─── Role badge helper ────────────────────────────────────────────────────────

const ROLE_BADGE: Record<DVoteRole, { label: string; className: string }> = {
  Owner: {
    label: "Owner",
    className: "bg-violet-100 text-violet-800 border-violet-200",
  },
  Voter: {
    label: "Voter",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  Candidate: {
    label: "Candidate",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  Observer: {
    label: "Observer",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono = false,
  sensitive = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  sensitive?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:items-start py-2.5 border-b border-border last:border-0">
      <dt className="text-xs font-medium text-muted-foreground sm:w-44 shrink-0">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-foreground break-all",
          mono && "font-mono",
          sensitive && "tracking-widest",
          !value && "text-muted-foreground italic"
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">
      {children}
    </p>
  )
}

// ─── ProfileDetailsForm component ─────────────────────────────────────────────

/**
 * Read-only profile details display with identity summary and KYC status.
 * Aadhaar masked per L-C2 on all profile display surfaces.
 */
export function ProfileDetailsForm({
  walletAddress,
  role,
  kycData,
  isLoading = false,
  fetchError,
  electionId,
}: ProfileDetailsFormProps) {
  const roleBadge = ROLE_BADGE[role]

  // Derived KYC display values
  const maskedAadhaar = kycData?.aadhaar
    ? maskAadhaar(kycData.aadhaar)
    : null
  const epicDisplay = kycData?.epic || null
  const submissionDate = kycData?.submittedAt
    ? new Date(kycData.submittedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null
  const statusLabel = kycData?.state ? kycStatusLabel(kycData.state) : null
  const statusVariant = kycData?.state ? kycStatusVariant(kycData.state) : null

  // Status badge class from variant
  const STATUS_VARIANT_CLASS: Record<string, string> = {
    success: "bg-green-100 text-green-800 border-green-200",
    destructive: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    secondary: "bg-slate-100 text-slate-700 border-slate-200",
    default: "bg-muted text-muted-foreground border-border",
  }

  return (
    <div className="space-y-4">
      {/* Account section */}
      <div>
        <SectionHeading>Account</SectionHeading>
        <dl className="rounded-lg border bg-card px-4 divide-y divide-border">
          {/* Wallet address */}
          <div className="flex flex-col sm:flex-row gap-1 sm:items-center py-2.5">
            <dt className="text-xs font-medium text-muted-foreground sm:w-44 shrink-0 flex items-center gap-1.5">
              <Wallet className="size-3.5" aria-hidden="true" />
              Wallet Address
            </dt>
            <dd className="text-sm text-foreground font-mono break-all">
              {walletAddress}
            </dd>
          </div>
          {/* Role */}
          <div className="flex flex-col sm:flex-row gap-1 sm:items-center py-2.5">
            <dt className="text-xs font-medium text-muted-foreground sm:w-44 shrink-0 flex items-center gap-1.5">
              <UserCircle2 className="size-3.5" aria-hidden="true" />
              System Role
            </dt>
            <dd>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  roleBadge.className
                )}
              >
                {roleBadge.label}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* KYC section */}
      <div>
        <SectionHeading>
          KYC Submission
          {electionId && (
            <span className="ml-1 normal-case font-normal text-muted-foreground/60">
              (election {electionId.slice(0, 8)}…)
            </span>
          )}
        </SectionHeading>

        {/* Fetch error */}
        {fetchError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm mb-3">
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>{fetchError}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !fetchError && (
          <div className="rounded-lg border bg-card px-4 py-4 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-3 w-36 rounded bg-muted" />
                <div className="h-3 flex-1 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        )}

        {/* No KYC found */}
        {!isLoading && !fetchError && !kycData && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/40 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No KYC submission found.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Start the KYC wizard to begin your identity verification.
            </p>
          </div>
        )}

        {/* KYC data */}
        {!isLoading && !fetchError && kycData && (
          <dl className="rounded-lg border bg-card px-4 divide-y divide-border">
            {/* Status */}
            <div className="flex flex-col sm:flex-row gap-1 sm:items-center py-2.5">
              <dt className="text-xs font-medium text-muted-foreground sm:w-44 shrink-0">
                Status
              </dt>
              <dd>
                {statusLabel && statusVariant ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      STATUS_VARIANT_CLASS[statusVariant]
                    )}
                  >
                    {statusLabel}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">—</span>
                )}
              </dd>
            </div>
            {/* Aadhaar — masked (L-C2) */}
            <DetailRow
              label="Aadhaar Number"
              value={maskedAadhaar}
              mono
              sensitive
            />
            {/* EPIC */}
            {!kycData.isAadhaarOnly && (
              <DetailRow
                label="EPIC Voter ID"
                value={epicDisplay}
                mono
              />
            )}
            {/* Aadhaar-only flag */}
            {kycData.isAadhaarOnly && (
              <DetailRow
                label="Identity Path"
                value="Aadhaar-only fallback"
              />
            )}
            {/* Participant type */}
            {kycData.participantType && (
              <DetailRow
                label="Participant Type"
                value={kycData.participantType === "CANDIDATE" ? "Candidate" : "Voter"}
              />
            )}
            {/* Submitted date */}
            <DetailRow
              label="Submitted On"
              value={submissionDate}
            />
            {/* Submission ID (for traceability) */}
            <DetailRow
              label="Submission ID"
              value={kycData.submissionId}
              mono
            />
          </dl>
        )}
      </div>
    </div>
  )
}
