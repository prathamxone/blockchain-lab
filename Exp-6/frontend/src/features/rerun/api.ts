/**
 * DVote Frontend — Rerun API Layer
 *
 * Escalation ticket creation and ECI rerun execution.
 * Routes through /api/v1/owner/elections and /api/v1/eci/elections prefixes.
 *
 * Authority: BACKEND_HANDOFF_REPORT §5.1, FEATURE_FRONTEND §9.8
 */

import { apiClient } from "@/lib/api-client"

// ─── Escalation Ticket Types ───────────────────────────────────────────────────

export interface EscalationTicket {
  ticketId: string
  electionId: string
  category: string
  note: string
  evidenceHash?: string
  createdBy: string
  createdAt: string
  // Immutable after creation — no edit fields
}

export type EscalationCategory =
  | "VOTING_IRREGULARITY"
  | "KYC_MANIPULATION"
  | "RESULT_TAMPERING"
  | "INFRASTRUCTURE_FAILURE"
  | "OTHER"

export const ESCALATION_CATEGORIES: { value: EscalationCategory; label: string }[] = [
  { value: "VOTING_IRREGULARITY", label: "Voting Irregularity" },
  { value: "KYC_MANIPULATION", label: "KYC Manipulation" },
  { value: "RESULT_TAMPERING", label: "Result Tampering" },
  { value: "INFRASTRUCTURE_FAILURE", label: "Infrastructure Failure" },
  { value: "OTHER", label: "Other" },
]

// ─── ECI Rerun Execution Types ─────────────────────────────────────────────────

export interface RerunExecuteResult {
  success: boolean
  childElectionId?: string
  message: string
}

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/owner/elections/:id/rerun/escalation-ticket
 * Creates an immutable escalation ticket (Admin only).
 * Ticket becomes read-only immediately after successful creation.
 */
export async function createEscalationTicket(params: {
  electionId: string
  category: EscalationCategory
  note: string
  evidenceHash?: string
}): Promise<{ ticket: EscalationTicket }> {
  return apiClient.post<{ ticket: EscalationTicket }>(
    `/owner/elections/${params.electionId}/rerun/escalation-ticket`,
    {
      category: params.category,
      note: params.note,
      evidenceHash: params.evidenceHash,
    },
  )
}

/**
 * GET /api/v1/owner/elections/:id/rerun/escalation-ticket
 * Fetches existing escalation ticket for read-only display.
 */
export async function getEscalationTicket(
  electionId: string,
): Promise<{ ticket?: EscalationTicket }> {
  return apiClient.get<{ ticket?: EscalationTicket }>(
    `/owner/elections/${electionId}/rerun/escalation-ticket`,
  )
}

/**
 * POST /api/v1/eci/elections/:id/rerun/execute
 * Triggers on-chain rerun execution (ECI only).
 */
export async function executeRerun(electionId: string): Promise<RerunExecuteResult> {
  return apiClient.post<RerunExecuteResult>(
    `/eci/elections/${electionId}/rerun/execute`,
    {},
  )
}
