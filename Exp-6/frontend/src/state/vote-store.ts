/**
 * DVote Frontend — Vote State Store (Zustand)
 *
 * State machine for the complete vote journey:
 *   idle
 *     → token-requested   (POST /votes/token sent)
 *     → cast-ready        (token received, countdown starts)
 *     → submitting        (vote cast tx sent)
 *     → [confirmed | failed | expired | conflict | timeout-uncertain]
 *
 * Policy locks:
 *   L-D1: Countdown always visible from token issuance; 10s warning at ≤10s
 *   L-D2: Recast blocked until terminal state OR statusLookupWindowSec expires
 *
 * Timeout uncertainty handling:
 *   - Auto-poll GET /votes/status every recheckAfterSec (3s from backend)
 *   - Lookup precedence: voteIntentId first, then wallet+electionId+clientNonce tuple
 *   - Terminal states: confirmed, failed, expired, conflict
 *   - Non-terminal: submitted, pending, timeout-uncertain
 *
 * Authority: walkthrough Phase P, CDM-13, BACKEND_HANDOFF_REPORT §7.1
 */

import { create } from "zustand"
import { apiClient } from "@/lib/api-client"
import type { ApiError } from "@/lib/api-client"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Vote token TTL in seconds (backend fixed at 60s) */
export const VOTE_TOKEN_TTL_SEC = 60

/**
 * Safety buffer warning threshold in seconds.
 * When remaining seconds ≤ this value, show orange/saffron warning.
 * Policy L-D1: 10s safety buffer.
 */
export const VOTE_TOKEN_SAFETY_BUFFER_SEC = 10

/**
 * Auto-poll interval for vote status lookup during timeout-uncertain state.
 * Value from backend APP_CONSTANTS.voteStatusRecheckAfterSec.
 * Policy L-D2.
 */
export const VOTE_STATUS_RECHECK_SEC = 3

/**
 * Default status lookup window in seconds.
 * Used if backend doesn't provide one.
 */
export const VOTE_STATUS_LOOKUP_WINDOW_SEC = 120

// ─── Types ──────────────────────────────────────────────────────────────────

/** Vote intent identifier returned by POST /votes/token */
export type VoteIntentId = string

/** Client-side UUID v7 per vote attempt (required by backend) */
export type ClientNonce = string

/** Candidate index in election (0-based) */
export type CandidateIndex = number

/** Election identifier */
export type ElectionId = string

/** Wallet address of voter */
export type WalletAddress = string

/**
 * Core vote state machine states.
 * - idle: no vote in progress
 * - token-requested: waiting for token from backend
 * - cast-ready: token received, countdown running, ready to cast
 * - submitting: vote cast tx submitted, awaiting confirmation
 * - confirmed: vote recorded on chain
 * - failed: vote rejected by chain
 * - expired: vote token expired before cast
 * - conflict: vote already recorded (409 from backend)
 * - timeout-uncertain: relay outcome unknown
 */
export type VoteState =
  | "idle"
  | "token-requested"
  | "cast-ready"
  | "submitting"
  | "confirmed"
  | "failed"
  | "expired"
  | "conflict"
  | "timeout-uncertain"

/**
 * Terminal states — once reached, no automatic transitions occur.
 */
export const VOTE_TERMINAL_STATES: VoteState[] = [
  "confirmed",
  "failed",
  "expired",
  "conflict",
]

export function isVoteTerminal(state: VoteState): boolean {
  return VOTE_TERMINAL_STATES.includes(state)
}

/**
 * Non-terminal states — allow recast or status polling.
 */
export const VOTE_NON_TERMINAL_STATES: VoteState[] = [
  "idle",
  "token-requested",
  "cast-ready",
  "submitting",
  "timeout-uncertain",
]

export function isVoteNonTerminal(state: VoteState): boolean {
  return VOTE_NON_TERMINAL_STATES.includes(state)
}

// ─── API response types ──────────────────────────────────────────────────────

/** POST /votes/token response */
export interface VoteTokenResponse {
  voteIntentId: VoteIntentId
  expiresAt: string // ISO-8601
}

/** POST /votes/cast request body */
export interface VoteCastRequest {
  voteIntentId: VoteIntentId
  electionId: ElectionId
  candidateIndex: CandidateIndex
  clientNonce: ClientNonce
  wallet: WalletAddress
}

/** POST /votes/cast response */
export interface VoteCastResponse {
  txHash: string
  status: "submitted" | "confirmed" | "failed"
}

/** GET /votes/status lookup key variants */
export interface VoteStatusLookupByIntentId {
  voteIntentId: VoteIntentId
}

export interface VoteStatusLookupByTuple {
  wallet: WalletAddress
  electionId: ElectionId
  clientNonce: ClientNonce
}

/** GET /votes/status response */
export interface VoteStatusResponse {
  voteIntentId: VoteIntentId
  electionId: ElectionId
  wallet: WalletAddress
  clientNonce: ClientNonce
  state: VoteState
  terminal: boolean
  txHash?: string
  /** Seconds to wait before next status check (recheckAfterSec) */
  recheckAfterSec?: number
  /** Total lookup window in seconds (statusLookupWindowSec) */
  statusLookupWindowSec?: number
  /** When non-terminal, guidance for next action */
  retryable?: boolean
  retryableAfterSec?: number
}

// ─── Store state ─────────────────────────────────────────────────────────────

export interface VoteStoreState {
  // Current state
  state: VoteState

  // Token context
  voteIntentId: VoteIntentId | null
  tokenExpiresAt: Date | null
  electionId: ElectionId | null
  candidateIndex: CandidateIndex | null
  clientNonce: ClientNonce | null

  // Relay context
  txHash: string | null
  errorMessage: string | null

  // Timeout uncertainty tracking
  statusLookupStartedAt: Date | null
  statusLookupWindowSec: number

  // Actions
  requestToken: (params: {
    electionId: ElectionId
    wallet: WalletAddress
  }) => Promise<void>

  castVote: (params: {
    candidateIndex: CandidateIndex
    clientNonce: ClientNonce
    wallet: WalletAddress
  }) => Promise<void>

  checkStatus: (
    lookup: VoteStatusLookupByIntentId | VoteStatusLookupByTuple,
  ) => Promise<VoteStatusResponse | null>

  expireToken: () => void

  reset: () => void

  // Derived helpers
  getRemainingSeconds: () => number
  isWithinSafetyBuffer: () => boolean
  canCast: () => boolean
}

// ─── Store actions ────────────────────────────────────────────────────────────

const initialState: Pick<
  VoteStoreState,
  | "state"
  | "voteIntentId"
  | "tokenExpiresAt"
  | "electionId"
  | "candidateIndex"
  | "clientNonce"
  | "txHash"
  | "errorMessage"
  | "statusLookupStartedAt"
  | "statusLookupWindowSec"
> = {
  state: "idle",
  voteIntentId: null,
  tokenExpiresAt: null,
  electionId: null,
  candidateIndex: null,
  clientNonce: null,
  txHash: null,
  errorMessage: null,
  statusLookupStartedAt: null,
  statusLookupWindowSec: VOTE_STATUS_LOOKUP_WINDOW_SEC,
}

export const useVoteStore = create<VoteStoreState>((set, get) => ({
  ...initialState,

  // ─── requestToken ─────────────────────────────────────────────────────────

  /**
   * POST /api/v1/votes/token
   * Transitions: idle → token-requested → cast-ready
   */
  requestToken: async ({ electionId, wallet }) => {
    const currentState = get().state
    if (currentState !== "idle") {
      console.error("[vote-store] requestToken called in invalid state:", currentState)
      return
    }

    set({ state: "token-requested", electionId, errorMessage: null })

    try {
      const tokenResp = await apiClient.post<VoteTokenResponse>("/votes/token", {
        electionId,
        wallet,
      })

      const expiresAt = new Date(tokenResp.expiresAt)

      set({
        state: "cast-ready",
        voteIntentId: tokenResp.voteIntentId,
        tokenExpiresAt: expiresAt,
        electionId,
      })
    } catch (err) {
      const error = err as ApiError
      set({
        state: "idle",
        errorMessage: error.message ?? "Token request failed",
      })
      throw err
    }
  },

  // ─── castVote ──────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/votes/cast
   * Transitions: cast-ready → submitting → [confirmed | failed | conflict | timeout-uncertain]
   */
  castVote: async ({ candidateIndex, clientNonce, wallet }) => {
    const { state, voteIntentId, electionId } = get()

    if (state !== "cast-ready") {
      console.error("[vote-store] castVote called in invalid state:", state)
      return
    }

    if (!voteIntentId || !electionId) {
      console.error("[vote-store] castVote called without token context")
      set({ state: "idle" })
      return
    }

    set({ state: "submitting", candidateIndex, clientNonce, errorMessage: null })

    try {
      const castResp = await apiClient.post<VoteCastResponse>("/votes/cast", {
        voteIntentId,
        electionId,
        candidateIndex,
        clientNonce,
        wallet,
      })

      if (castResp.status === "confirmed") {
        set({ state: "confirmed", txHash: castResp.txHash ?? null })
      } else if (castResp.status === "failed") {
        set({ state: "failed", txHash: castResp.txHash ?? null })
      } else {
        // submitted — treat as timeout-uncertain until status confirms
        set({
          state: "timeout-uncertain",
          txHash: castResp.txHash ?? null,
          statusLookupStartedAt: new Date(),
        })
      }
    } catch (err) {
      const error = err as ApiError

      if (error.isConflict) {
        set({
          state: "conflict",
          errorMessage: "Vote already recorded for this election",
        })
        return
      }

      // Network or server error — treat as uncertain
      set({
        state: "timeout-uncertain",
        statusLookupStartedAt: new Date(),
        errorMessage: error.message ?? "Vote cast uncertain",
      })
    }
  },

  // ─── checkStatus ──────────────────────────────────────────────────────────

  /**
   * GET /api/v1/votes/status
   * Lookup precedence: voteIntentId first, then wallet+electionId+clientNonce
   * Transitions timeout-uncertain → [confirmed | failed | expired | conflict]
   */
  checkStatus: async (lookup) => {
    const { state } = get()

    // Only poll in non-terminal states
    if (isVoteTerminal(state) && state !== "timeout-uncertain") {
      return null
    }

    let statusResp: VoteStatusResponse | null = null

    try {
      // Try voteIntentId first
      if ("voteIntentId" in lookup) {
        statusResp = await apiClient.get<VoteStatusResponse>(
          `/votes/status?voteIntentId=${lookup.voteIntentId}`,
        )
      } else {
        // Fallback to tuple
        const { wallet, electionId, clientNonce } = lookup
        statusResp = await apiClient.get<VoteStatusResponse>(
          `/votes/status?wallet=${wallet}&electionId=${electionId}&clientNonce=${clientNonce}`,
        )
      }

      // Update window from response
      if (statusResp.statusLookupWindowSec) {
        set({ statusLookupWindowSec: statusResp.statusLookupWindowSec })
      }

      // Terminal transition
      if (statusResp.terminal || isVoteTerminal(statusResp.state)) {
        set({
          state: statusResp.state,
          txHash: statusResp.txHash ?? null,
        })
      }

      return statusResp
    } catch {
      // Status check failed — remain in current state
      return null
    }
  },

  // ─── expireToken ───────────────────────────────────────────────────────────

  /**
   * Force transition to expired when token TTL elapses.
   * Called by countdown timer when remaining seconds reach 0.
   */
  expireToken: () => {
    const { state } = get()
    if (state === "cast-ready" || state === "token-requested") {
      set({
        state: "expired",
        voteIntentId: null,
        tokenExpiresAt: null,
      })
    }
  },

  // ─── reset ─────────────────────────────────────────────────────────────────

  /** Clear all state to idle — used after terminal state or user abort */
  reset: () => {
    set({ ...initialState })
  },

  // ─── Derived helpers ────────────────────────────────────────────────────────

  /** Seconds remaining until token expires (0 if expired or no token) */
  getRemainingSeconds: () => {
    const { tokenExpiresAt, state } = get()
    if (!tokenExpiresAt || state === "expired" || state === "idle") {
      return 0
    }
    const remaining = Math.max(0, Math.floor((tokenExpiresAt.getTime() - Date.now()) / 1000))
    return remaining
  },

  /** True when remaining token time is within the 10s safety buffer */
  isWithinSafetyBuffer: () => {
    return get().getRemainingSeconds() <= VOTE_TOKEN_SAFETY_BUFFER_SEC
  },

  /** True when the vote cast action is currently allowed */
  canCast: () => {
    const { state } = get()
    return state === "cast-ready" && get().getRemainingSeconds() > 0
  },
}))

// ─── UUID v7 generator ───────────────────────────────────────────────────────

/**
 * Generates a UUID v7 string for clientNonce.
 * Format: tttttttt-ttttmrmpx-ttttv7id-tttttttttttttttt
 * Uses timestamp + random for uniqueness.
 */
export function generateClientNonce(): ClientNonce {
  const now = Date.now()
  const timeLow = (now & 0xffffffff).toString(16).padStart(8, "0")
  const timeMid = ((now >> 32) & 0xffff).toString(16).padStart(4, "0")
  const timeHigh = (((now >> 48) & 0x0fff) | 0x7000).toString(16).padStart(4, "0") // v7 marker
  const clockSeq = ((Math.floor(Math.random() * 0x3fff)) | 0x8000).toString(16).padStart(4, "0")
  const node = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 0xff).toString(16).padStart(2, "0"),
  ).join("")

  return `${timeLow}-${timeMid}-${timeHigh}-${clockSeq}-${node}`
}
