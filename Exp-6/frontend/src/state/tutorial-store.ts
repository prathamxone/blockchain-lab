/**
 * DVote Frontend — Tutorial Progress Store (Zustand + localStorage)
 *
 * Persists per-role tutorial step progress using localStorage.
 * Key format (CDM-16 enforcement): `tutorial:{wallet}:{role}:{appVersion}`
 *
 * - Wallet-only key causes role collision when a user switches roles.
 * - appVersion is included so tutorial steps can be redesigned between releases
 *   without confusing old progress with new step indices.
 *
 * Authority: walkthrough Phase S, FEATURE_FRONTEND §11.3
 */

import { create } from "zustand"
import { env } from "@/config/env"
import { getWalletAddress } from "@/state/auth-store"
import type { TutorialTrack } from "@/features/tutorials/tutorial-config"

// ─── Storage key ─────────────────────────────────────────────────────────────

/**
 * Build the localStorage key for a tutorial track.
 * Includes wallet + role + appVersion to prevent cross-role contamination (CDM-16).
 */
export function buildTutorialKey(role: string): string {
  const wallet = getWalletAddress()
  if (!wallet) return "" // not authenticated yet — no key
  return `tutorial:${wallet.toLowerCase()}:${role}:${env.appVersion}`
}

// ─── Persisted progress shape ────────────────────────────────────────────────

export interface TutorialProgress {
  /** Set of completed step identifiers */
  completedSteps: Set<string>
  /** true if the user has ever started this track */
  hasStarted: boolean
  /** true if the user completed all steps (or explicitly finished early) */
  isCompleted: boolean
}

// ─── Store state ─────────────────────────────────────────────────────────────

interface TutorialStoreState {
  /** Current active track */
  activeTrack: TutorialTrack | null
  /** Current step index for the running tour */
  currentStep: number
  /** Whether the Joyride tour is running */
  isRunning: boolean
  /** Loaded progress keyed by role */
  progress: Partial<Record<TutorialTrack, TutorialProgress>>
  /** Track of the last-known role to detect role changes (CDM-16) */
  lastRole: string | null
}

interface TutorialStoreActions {
  /**
   * Begin or resume a tutorial tour.
   * - first visit:  starts from step 0
   * - returning:    resumes from last incomplete step (or restarts if completed)
   * - role changed: resets to step 0 (CDM-16)
   */
  startTour: (track: TutorialTrack) => void
  /** Advance to the next step */
  nextStep: () => void
  /** Skip / close the tour early */
  endTour: () => void
  /** Mark the current step as complete and advance */
  completeStep: (stepId: string) => void
  /** Full replay — resets all progress for the given track */
  replayTour: (track: TutorialTrack) => void
  /** Called by auth layer when role changes — resets if role differs */
  onRoleChange: (newRole: string | null) => void
  /** Load persisted progress from localStorage for a track */
  loadProgress: (track: TutorialTrack) => TutorialProgress | null
  /** Persist progress to localStorage */
  saveProgress: (track: TutorialTrack, progress: TutorialProgress) => void
  /** Clear persisted progress for a track (used on replay) */
  clearProgress: (track: TutorialTrack) => void
  /** Check if a step has been completed */
  isStepCompleted: (track: TutorialTrack, stepId: string) => boolean
}

type TutorialStore = TutorialStoreState & TutorialStoreActions

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: TutorialStoreState = {
  activeTrack: null,
  currentStep: 0,
  isRunning: false,
  progress: {},
  lastRole: null,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadFromStorage(key: string): TutorialProgress | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { completedSteps: string[]; hasStarted: boolean; isCompleted: boolean }
    return {
      completedSteps: new Set(parsed.completedSteps ?? []),
      hasStarted: parsed.hasStarted ?? false,
      isCompleted: parsed.isCompleted ?? false,
    }
  } catch {
    return null
  }
}

function saveToStorage(key: string, progress: TutorialProgress): void {
  try {
    localStorage.setItem(key, JSON.stringify({
      completedSteps: Array.from(progress.completedSteps),
      hasStarted: progress.hasStarted,
      isCompleted: progress.isCompleted,
    }))
  } catch {
    // localStorage may be unavailable (e.g., private browsing)
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── Load ──────────────────────────────────────────────────────────────────

  loadProgress: (track) => {
    const state = get()
    // Return cached if available
    if (state.progress[track]) return state.progress[track]!
    // Try loading from localStorage
    const roleKey = track // owner | observer | voter
    const key = buildTutorialKey(roleKey)
    if (!key) return null
    const loaded = loadFromStorage(key)
    if (loaded) {
      set((s) => ({ progress: { ...s.progress, [track]: loaded } }))
    }
    return loaded
  },

  // ── Save ──────────────────────────────────────────────────────────────────

  saveProgress: (track, progress) => {
    const roleKey = track
    const key = buildTutorialKey(roleKey)
    if (!key) return
    saveToStorage(key, progress)
    set((s) => ({ progress: { ...s.progress, [track]: progress } }))
  },

  clearProgress: (track) => {
    const roleKey = track
    const key = buildTutorialKey(roleKey)
    if (key) localStorage.removeItem(key)
    set((s) => ({
      progress: { ...s.progress, [track]: { completedSteps: new Set(), hasStarted: false, isCompleted: false } },
    }))
  },

  // ── Tour lifecycle ─────────────────────────────────────────────────────────

  startTour: (track) => {
    set({ activeTrack: track, currentStep: 0, isRunning: true })
  },

  nextStep: () => {
    set((s) => ({ currentStep: s.currentStep + 1 }))
  },

  endTour: () => {
    const { activeTrack } = get()
    if (activeTrack) {
      // Mark current position as "last seen" but do not mark completed
      const progress = get().progress[activeTrack] ?? { completedSteps: new Set(), hasStarted: true, isCompleted: false }
      progress.hasStarted = true
      get().saveProgress(activeTrack, progress)
    }
    set({ isRunning: false, currentStep: 0, activeTrack: null })
  },

  completeStep: (stepId) => {
    const { activeTrack } = get()
    if (!activeTrack) return
    const progress = get().progress[activeTrack] ?? { completedSteps: new Set(), hasStarted: true, isCompleted: false }
    progress.completedSteps.add(stepId)
    progress.hasStarted = true
    get().saveProgress(activeTrack, progress)
  },

  replayTour: (track) => {
    get().clearProgress(track)
    set({ activeTrack: track, currentStep: 0, isRunning: true })
  },

  // ── Role-change reset (CDM-16) ─────────────────────────────────────────────

  onRoleChange: (newRole) => {
    const { lastRole } = get()
    if (newRole !== lastRole) {
      // Role changed — reset active tutorial state so new track starts fresh
      set({ isRunning: false, currentStep: 0, activeTrack: null, lastRole: newRole })
    }
  },

  // ── Query ──────────────────────────────────────────────────────────────────

  isStepCompleted: (track, stepId) => {
    const p = get().progress[track]
    return p?.completedSteps.has(stepId) ?? false
  },
}))
