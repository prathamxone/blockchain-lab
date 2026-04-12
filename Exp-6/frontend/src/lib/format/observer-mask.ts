/**
 * DVote Frontend — Observer Defensive Masking (CDM-12)
 *
 * CDM-12 risk: Observer screens may receive identity-linked fields if
 * backend response shape drifts. The observer role is intentionally
 * restricted to aggregate contexts. Identity exposure on observer surfaces
 * is a critical privacy violation.
 *
 * This module implements a CLIENT-SIDE defensive safety layer that:
 *   1. Defines the set of FORBIDDEN fields for observer-role API responses.
 *   2. Strips any leaked forbidden fields from API response objects before render.
 *   3. Emits a telemetry warning (console.warn) if any forbidden field was detected.
 *      This is a signal for backend drift that must be investigated.
 *
 * Usage:
 *   // Apply in all observer-facing API response handlers:
 *   const safe = maskObserverResponse(rawApiResponse)
 *   // Or for a list of items:
 *   const safeItems = items.map(maskObserverResponse)
 *
 * This masking is applied BY THE OBSERVER FEATURE COMPONENTS — never by
 * owner components. The functions are no-ops for non-observer paths.
 *
 * Authority: walkthrough Phase N, CDM-12, FEATURE_FRONTEND §7.2, Plan Phase 14
 */

// ─── Forbidden fields for Observer role ───────────────────────────────────────

/**
 * Fields that must NEVER appear in observer-facing render contexts.
 * Removing a field from here requires explicit security review and plan update.
 */
export const FORBIDDEN_OBSERVER_FIELDS: readonly string[] = [
  // Identity fields
  "aadhaar",
  "aadhaarHash",
  "aadhaarCanonical",
  "epic",
  "epicHash",
  "epicCanonical",
  "fullName",
  "dateOfBirth",
  "addressLine1",
  "addressLine2",
  "pincode",
  // Wallet address (identity-linked)
  "wallet",
  // Document and artifact references
  "submissionId",
  "queueId",
  "objectKey",
  "artifactId",
  "uploadUrl",
  // Personal metadata
  "phoneNumber",
  "email",
  // Audit trail (identity-linked)
  "actorWallet",
] as const

// ─── maskObserverResponse ──────────────────────────────────────────────────────

/**
 * Strips all forbidden identity-linked fields from a raw API response object
 * before it can reach the observer UI render layer (CDM-12).
 *
 * Also emits a console.warn telemetry signal for each leaked field detected.
 *
 * @param raw - Raw API response object (any shape)
 * @returns A new object with all FORBIDDEN_OBSERVER_FIELDS removed.
 */
export function maskObserverResponse<T extends Record<string, unknown>>(
  raw: T
): Omit<T, typeof FORBIDDEN_OBSERVER_FIELDS[number]> {
  const leaked: string[] = []

  const result = { ...raw }

  for (const field of FORBIDDEN_OBSERVER_FIELDS) {
    if (field in result) {
      leaked.push(field)
      delete result[field as keyof typeof result]
    }
  }

  if (leaked.length > 0) {
    // Telemetry warning — this signals backend drift
    console.warn(
      "[CDM-12] Observer response contained forbidden identity fields. " +
        "These have been stripped client-side. Fields detected: " +
        leaked.join(", ") +
        ". Please investigate backend response shape for observer endpoints."
    )
  }

  return result as Omit<T, typeof FORBIDDEN_OBSERVER_FIELDS[number]>
}

// ─── maskObserverList ──────────────────────────────────────────────────────────

/**
 * Applies maskObserverResponse to each item in a list.
 * Use for array-shaped API responses on observer surfaces.
 *
 * @param items - Array of raw API response objects
 * @returns Array of sanitized objects with forbidden fields removed.
 */
export function maskObserverList<T extends Record<string, unknown>>(
  items: T[]
): Omit<T, typeof FORBIDDEN_OBSERVER_FIELDS[number]>[] {
  return items.map(maskObserverResponse)
}

// ─── isObserverSafe ────────────────────────────────────────────────────────────

/**
 * Checks whether a response object contains any forbidden fields.
 * Returns true if no forbidden fields are present (observer-safe).
 * Returns false if ANY forbidden field is found (unsafe — masking required).
 *
 * Use for early assertion checks in observer components.
 *
 * @param raw - Raw API response object
 */
export function isObserverSafe(raw: Record<string, unknown>): boolean {
  return FORBIDDEN_OBSERVER_FIELDS.every((field) => !(field in raw))
}
