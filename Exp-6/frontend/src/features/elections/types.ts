/**
 * DVote Frontend — Election Types
 *
 * TypeScript types mirroring the backend election API contracts.
 * All enum values are exact backend strings — no inference.
 *
 * Authority: BACKEND_HANDOFF_REPORT §7.4, FEATURE_FRONTEND §9
 */

import type { BackendPagination } from "@/hooks/usePaginatedList"

// ─── Election Lifecycle Status ────────────────────────────────────────────────

/**
 * Exact backend enum values from BACKEND_HANDOFF_REPORT §7.4.
 * These MUST match Foundry contract enum values 0–5.
 */
export type ElectionStatus =
  | "Draft"
  | "RegistrationOpen"
  | "VotingOpen"
  | "VotingClosed"
  | "Finalized"
  | "Superseded"

// ─── Election Result Finalization Outcome ────────────────────────────────────

/**
 * Exact backend enum values from BACKEND_HANDOFF_REPORT §7.2.
 * Frontend renders these deterministically without inference.
 */
export type FinalizationOutcome =
  | "CandidateWon"
  | "NotaTriggeredRerun"
  | "TieLotCandidateWon"
  | "TieLotNotaTriggeredRerun"

// ─── Rerun SLA State ──────────────────────────────────────────────────────────

export type RerunSlaState = "on-track" | "due-soon" | "breached"

// ─── Candidate ─────────────────────────────────────────────────────────────────

export interface ElectionCandidate {
  candidateId: string
  name: string
  partyAffiliation?: string
  isNota: boolean
  isWithdrawn: boolean
  registrationStatus: "Registered" | "Withdrawn" | "Rejected"
}

// ─── Parent / Child Election Reference ─────────────────────────────────────────

export interface ElectionParentRef {
  electionId: string
  title: string
  status: ElectionStatus
  votingClosedAt?: string
}

export interface ElectionChildRef {
  electionId: string
  title: string
  status: ElectionStatus
  rerunTriggeredAt: string
}

// ─── Election Detail ───────────────────────────────────────────────────────────

export interface Election {
  electionId: string
  title: string
  description?: string
  status: ElectionStatus
  constituency: string
  state: string
  contestingCandidateCap?: number
  votingStartsAt?: string
  votingEndsAt?: string
  votingClosedAt?: string
  registrationStartsAt?: string
  registrationEndsAt?: string
  finalizedAt?: string
  candidateCount: number
  candidates: ElectionCandidate[]
  notaEnabled: boolean
  voterCount?: number
  parentElectionId?: string
  childElectionId?: string
  winnerId?: string
  finalizationOutcome?: FinalizationOutcome
  rerunDeadline?: string
  rerunSlaState?: RerunSlaState
  isSuperseded: boolean
  freshnessState?: "fresh" | "stale" | "degraded"
}

// ─── Election List Item (lighter shape for list views) ────────────────────────

export interface ElectionListItem {
  electionId: string
  title: string
  constituency: string
  state: string
  status: ElectionStatus
  votingStartsAt?: string
  votingEndsAt?: string
  candidateCount: number
  notaEnabled: boolean
  voterCount?: number
  isSuperseded: boolean
  childElectionId?: string
  freshnessState?: "fresh" | "stale" | "degraded"
}

// ─── Paginated Election List Response ─────────────────────────────────────────

export interface ElectionListResponse {
  items: ElectionListItem[]
  pagination: BackendPagination
}

// ─── Lineage Response ─────────────────────────────────────────────────────────

export interface ElectionLineage {
  parent?: ElectionParentRef
  child?: ElectionChildRef
  rerunStatus?: {
    slaState: RerunSlaState
    deadline?: string
    escalationTicketId?: string
  }
}

// ─── Rerun Status Response ────────────────────────────────────────────────────

export interface RerunStatus {
  electionId: string
  isRerunRequired: boolean
  slaState: RerunSlaState
  deadline?: string
  rerunCount: number
}
