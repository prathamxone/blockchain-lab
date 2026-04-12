/**
 * DVote Frontend — Typed URL Search Param Helpers
 *
 * Provides strongly-typed serializers/parsers for URL search params
 * used across election list filters, tabs, pagination, and returnTo flow.
 *
 * TanStack Router's `validateSearch` prop is used to coerce and validate
 * search params into typed shapes at route entry. These helpers
 * define the schemas consumed by those validators.
 *
 * Patterns:
 *   - Safe defaults: always return typed defaults when params are absent
 *   - Coercion: string URLs parsed safely — no throws on malformed input
 *   - Pagination: page number with PAGINATION_CURSOR_INVALID offset fallback
 *   - Filter retention: filters written to URL survive page refresh and share
 *
 * Authority: walkthrough Phase F §4, FEATURE_FRONTEND §5.5
 * BACKEND_HANDOFF_REPORT §4.1 (pagination: `page` + `limit` query params)
 */

import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── 1. returnTo (auth redirect flow) ────────────────────────────────────────

/**
 * Search params for the login / landing page.
 * `returnTo` is set by the guard when redirecting unauthenticated access.
 * After login, router restores the stored path if role policy allows.
 */
export interface LoginSearchParams {
  /** URL-encoded path of the intended destination before redirect. */
  returnTo?: string
  /** Reason code surfaced in login UI (e.g., "session_expired", "role_mismatch"). */
  reason?: "session_expired" | "role_mismatch" | "governance_lock" | "unauthorized"
}

/**
 * Parse and validate login search params with safe defaults.
 * TanStack Router validateSearch callback — never throws.
 */
export function validateLoginSearch(search: Record<string, unknown>): LoginSearchParams {
  const returnTo =
    typeof search.returnTo === "string" && search.returnTo.startsWith("/")
      ? search.returnTo
      : undefined

  const validReasons = ["session_expired", "role_mismatch", "governance_lock", "unauthorized"] as const
  const reason = validReasons.includes(search.reason as typeof validReasons[number])
    ? (search.reason as LoginSearchParams["reason"])
    : undefined

  return { returnTo, reason }
}

// ─── 2. Elections list filters ────────────────────────────────────────────────

/**
 * Election lifecycle status values (matches backend enum exactly).
 * undefined = all statuses (no filter applied).
 */
export type ElectionStatusFilter =
  | "Draft"
  | "RegistrationOpen"
  | "VotingOpen"
  | "VotingClosed"
  | "Finalized"
  | "Superseded"

export interface ElectionsListSearchParams {
  /** Filter by election lifecycle status. */
  status?: ElectionStatusFilter
  /** Free-text search against election title. */
  q?: string
  /** Current page number (1-indexed). */
  page: number
  /** Results per page. Backend max is 50. */
  limit: number
  /** Sort field. Defaults to createdAt desc. */
  sort?: "createdAt" | "votingOpensAt" | "title"
  /** Sort direction. */
  dir?: "asc" | "desc"
}

const ELECTIONS_VALID_STATUSES: ElectionStatusFilter[] = [
  "Draft", "RegistrationOpen", "VotingOpen", "VotingClosed", "Finalized", "Superseded",
]

const ELECTIONS_DEFAULT: ElectionsListSearchParams = {
  page: 1,
  limit: 20,
}

/**
 * Parse and sanitize election list search params.
 * PAGINATION_CURSOR_INVALID: falls back to page=1 when page param is non-numeric.
 */
export function validateElectionsSearch(
  search: Record<string, unknown>,
): ElectionsListSearchParams {
  const rawPage = Number(search.page)
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1 // offset fallback

  const rawLimit = Number(search.limit)
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50
    ? rawLimit
    : ELECTIONS_DEFAULT.limit

  const status = ELECTIONS_VALID_STATUSES.includes(search.status as ElectionStatusFilter)
    ? (search.status as ElectionStatusFilter)
    : undefined

  const q =
    typeof search.q === "string" && search.q.trim().length > 0
      ? search.q.trim()
      : undefined

  const validSorts = ["createdAt", "votingOpensAt", "title"] as const
  const sort = validSorts.includes(search.sort as typeof validSorts[number])
    ? (search.sort as ElectionsListSearchParams["sort"])
    : undefined

  const dir = search.dir === "asc" || search.dir === "desc"
    ? search.dir
    : undefined

  return { page, limit, status, q, sort, dir }
}

// ─── 3. Results list filters ──────────────────────────────────────────────────

export interface ResultsListSearchParams {
  page: number
  limit: number
  q?: string
}

export function validateResultsSearch(
  search: Record<string, unknown>,
): ResultsListSearchParams {
  const rawPage = Number(search.page)
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1

  const rawLimit = Number(search.limit)
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50
    ? rawLimit
    : 20

  const q =
    typeof search.q === "string" && search.q.trim().length > 0
      ? search.q.trim()
      : undefined

  return { page, limit, q }
}

// ─── 4. KYC queue filters (Owner only) ───────────────────────────────────────

export type KycStatusFilter =
  | "Pending"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "ResubmissionRequired"

export interface KycQueueSearchParams {
  status?: KycStatusFilter
  page: number
  limit: number
}

const KYC_VALID_STATUSES: KycStatusFilter[] = [
  "Pending", "UnderReview", "Approved", "Rejected", "ResubmissionRequired",
]

export function validateKycQueueSearch(
  search: Record<string, unknown>,
): KycQueueSearchParams {
  const rawPage = Number(search.page)
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1

  const rawLimit = Number(search.limit)
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50
    ? rawLimit
    : 20

  const status = KYC_VALID_STATUSES.includes(search.status as KycStatusFilter)
    ? (search.status as KycStatusFilter)
    : undefined

  return { page, limit, status }
}

// ─── 5. Inbox filters ─────────────────────────────────────────────────────────

export interface InboxSearchParams {
  page: number
  limit: number
  /** Filter to only unread notifications. */
  unreadOnly?: boolean
}

export function validateInboxSearch(
  search: Record<string, unknown>,
): InboxSearchParams {
  const rawPage = Number(search.page)
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const rawLimit = Number(search.limit)
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50
    ? rawLimit
    : 20
  const unreadOnly = search.unreadOnly === "true" || search.unreadOnly === true
    ? true
    : undefined

  return { page, limit, unreadOnly }
}

// ─── 6. Role → home route mapping ────────────────────────────────────────────

/**
 * Maps a resolved backend role to its canonical home route.
 * FEATURE_FRONTEND §5.4: never derive from JWT — use backend /auth/me response.
 */
export const ROLE_HOME_ROUTES: Record<DVoteRole, string> = {
  Owner:     "/admin",
  Observer:  "/observer",
  Voter:     "/voter",
  Candidate: "/voter",  // Candidate shares the voter shell in MVP (§5.4)
}

/**
 * Returns the home route for a given role.
 * Falls back to "/" (landing) when role is unknown.
 */
export function getRoleHome(role: DVoteRole | null): string {
  if (!role) return "/"
  return ROLE_HOME_ROUTES[role] ?? "/"
}
