/**
 * DVote Frontend — Identity Masking and Canonicalization Utilities
 *
 * Aadhaar Display Rules (L-C2, FEATURE_FRONTEND §1.5):
 *   - Input/edit steps (Steps 2–3): display fully visible as typed
 *   - Review step (Step 5) and all list/read contexts: mask as XXXX-XXXX-1234
 *   - NEVER expose full Aadhaar in shared screens, notifications, or URLs
 *
 * EPIC Display Rules:
 *   - EPIC is always displayed in uppercase
 *   - EPIC is not masked on the Review step (official voter ID — 10-char alphanumeric)
 *
 * Canonicalization:
 *   - Aadhaar canonical: strip spaces and hyphens, 12 digits only
 *   - EPIC canonical: uppercase, trim, strip spaces
 *
 * These helpers are used exclusively by the KYC wizard step components.
 * They operate on the LOCAL (unencrypted) form values ONLY.
 * Backend encrypts and hashes the canonical values.
 *
 * Authority: FEATURE_FRONTEND §1.5 (L-C2), walkthrough Phase K, CDM-10
 */

// ─── Aadhaar utilities ────────────────────────────────────────────────────────

/**
 * Strips all non-digit characters from a raw Aadhaar input.
 * Result: 12-digit string (or shorter if still being typed).
 * Example: "1234 5678 9012" → "123456789012"
 */
export function canonicalizeAadhaar(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 12)
}

/**
 * Formats a raw or canonical Aadhaar for display during input (Steps 2–3).
 * Groups digits as "XXXX XXXX XXXX" with spaces.
 * Example: "123456789012" → "1234 5678 9012"
 */
export function formatAadhaarDisplay(raw: string): string {
  const digits = canonicalizeAadhaar(raw)
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
}

/**
 * Masks an Aadhaar for the Review step and all read/list contexts (L-C2).
 * Shows only the last 4 digits: XXXX-XXXX-1234
 *
 * @param canonical - 12-digit canonical Aadhaar string
 * @returns Masked form "XXXX-XXXX-1234" or "—" if canonical is too short
 */
export function maskAadhaar(canonical: string): string {
  const digits = canonical.replace(/\D/g, "")
  if (digits.length < 4) return "—"
  const last4 = digits.slice(-4)
  return `XXXX-XXXX-${last4}`
}

/**
 * Validates that a canonical Aadhaar string is exactly 12 digits.
 */
export function isValidAadhaar(canonical: string): boolean {
  return /^\d{12}$/.test(canonical.replace(/\s/g, ""))
}

// ─── EPIC utilities ───────────────────────────────────────────────────────────

/**
 * Canonicalizes an EPIC voter ID: uppercase, trim, collapse interior spaces.
 * Example: " abc 1234567 " → "ABC1234567"
 */
export function canonicalizeEPIC(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "").trim()
}

/**
 * Validates that a canonical EPIC is a 10-character alphanumeric string.
 * Note: strict format per ECI specification — 3 letters + 7 digits.
 * This validates the general 10-char alphanumeric form for MVP.
 */
export function isValidEPIC(canonical: string): boolean {
  return /^[A-Z0-9]{10}$/.test(canonical)
}

// ─── Reason code utilities ────────────────────────────────────────────────────

/**
 * Aadhaar-only fallback reason codes per DVote MVP specification.
 * These are the values to display in the reason code dropdown (Step 2).
 */
export const AADHAAR_ONLY_REASON_CODES: readonly {
  value: string
  label: string
}[] = [
  { value: "EPIC_NOT_ISSUED", label: "EPIC not yet issued by ECI" },
  { value: "EPIC_LOST", label: "EPIC lost or damaged" },
  { value: "NAME_MISMATCH", label: "Name mismatch on EPIC requires correction" },
  { value: "RECENTLY_ENROLLED", label: "Recently enrolled voter, EPIC delivery pending" },
  { value: "OTHER", label: "Other (describe in additional evidence)" },
] as const

export type AadhaarOnlyReasonCode = (typeof AADHAAR_ONLY_REASON_CODES)[number]["value"]

// ─── KYC status display utilities ────────────────────────────────────────────

/**
 * KYC submission state values returned by backend (KycState enum).
 */
export type KycStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "QUEUED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_RESUBMISSION"

/**
 * Human-readable label for each KYC status.
 */
export function kycStatusLabel(status: KycStatus): string {
  const labels: Record<KycStatus, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    QUEUED: "In Queue",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    NEEDS_RESUBMISSION: "Needs Resubmission",
  }
  return labels[status] ?? status
}

/**
 * Returns the badge variant for each KYC status.
 * Consumed by StatusChip or badge components.
 */
export function kycStatusVariant(
  status: KycStatus,
): "success" | "destructive" | "warning" | "secondary" | "default" {
  switch (status) {
    case "APPROVED":
      return "success"
    case "REJECTED":
      return "destructive"
    case "NEEDS_RESUBMISSION":
      return "warning"
    case "UNDER_REVIEW":
    case "QUEUED":
      return "secondary"
    default:
      return "default"
  }
}
