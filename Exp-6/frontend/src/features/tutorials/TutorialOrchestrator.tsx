/**
 * DVote Frontend — Tutorial Orchestrator
 *
 * Wraps react-joyride and wires it to the tutorial store.
 * Renders the Joyride Tour component with role-specific steps.
 *
 * Responsibilities:
 * - Listen for STEP_AFTER to mark steps complete
 * - Listen for TOUR_END / STATUS=finished to finalize progress
 * - Listen for TARGET_NOT_FOUND to gracefully skip missing steps
 * - Expose controls for replay via store actions
 * - Auto-start on first visit per role
 * - Reset on role change (CDM-16)
 *
 * Authority: walkthrough Phase S, FEATURE_FRONTEND §11
 */

import { useEffect, useCallback } from "react"
import { Joyride, EVENTS, STATUS, type EventHandler } from "react-joyride"

import { useTutorialStore } from "@/state/tutorial-store"
import {
  TUTORIAL_TRACKS,
  toJoyrideSteps,
  roleToTrack,
  type TutorialTrack,
} from "./tutorial-config"
import { useAuthStore } from "@/state/auth-store"

// ─── Custom DVote Joyride styles ───────────────────────────────────────────────

const JOYRIDE_STYLES = {
  overlay: {
    background: "rgba(0, 0, 0, 0.45)",
  },
  tooltip: {
    borderRadius: "8px",
    fontSize: "14px",
  },
  buttonNext: {
    background: "#E87F24",   // Saffron — DVote primary
    color: "#fff",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    padding: "6px 16px",
  },
  buttonBack: {
    color: "#6b7280",
    marginRight: "8px",
  },
  buttonSkip: {
    color: "#9ca3af",
    fontSize: "12px",
  },
  beacon: {
    background: "#48A111",   // Green — DVote accent
  },
}

// ─── TutorialOrchestrator ─────────────────────────────────────────────────────

export function TutorialOrchestrator() {
  const role = useAuthStore((s) => s.role)
  const walletAddress = useAuthStore((s) => s.walletAddress)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  const {
    isRunning,
    activeTrack,
    currentStep,
    progress,
    lastRole,
    startTour,
    endTour,
    completeStep,
    onRoleChange,
    loadProgress,
    saveProgress,
  } = useTutorialStore()

  // ── Derive the track for the current role ──────────────────────────────────
  const track: TutorialTrack | null = role ? roleToTrack(role) : null

  // ── Load persisted progress when track is available ───────────────────────
  useEffect(() => {
    if (!track) return
    loadProgress(track)
  }, [track, loadProgress])

  // ── Role-change detection: reset tutorial on role switch (CDM-16) ─────────
  useEffect(() => {
    if (!isAuthenticated || !role) return
    if (role !== lastRole) {
      onRoleChange(role)
    }
  }, [role, isAuthenticated, lastRole, onRoleChange])

  // ── Auto-start on first authenticated visit per role ───────────────────────
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !track) return

    // Only auto-start if not previously started
    const existing = progress[track]
    if (existing?.hasStarted) return

    // Small delay to let the page render before showing the first beacon
    const timer = setTimeout(() => {
      startTour(track)
    }, 800)

    return () => clearTimeout(timer)
  }, [isHydrated, isAuthenticated, track, progress, startTour])

  // ── Joyride event callback ─────────────────────────────────────────────────
  const handleJoyrideEvent: EventHandler = useCallback(
    (data) => {
      const { type, step, status } = data

      switch (type) {
        case EVENTS.STEP_AFTER: {
          // Mark the current step complete using the custom step field
          const stepId = (step as { step?: string })?.step
          if (stepId && activeTrack) {
            completeStep(stepId)
          }
          break
        }

        case EVENTS.TOUR_END:
        case EVENTS.TOUR_STATUS: {
          if (status === STATUS.FINISHED || type === EVENTS.TOUR_END) {
            if (activeTrack) {
              const prog = progress[activeTrack] ?? {
                completedSteps: new Set<string>(),
                hasStarted: true,
                isCompleted: false,
              }
              // Check if all steps are done
              const allSteps = TUTORIAL_TRACKS[activeTrack] ?? []
              const allDone = allSteps.every((s) => prog.completedSteps.has(s.step))
              if (allDone) {
                prog.isCompleted = true
                saveProgress(activeTrack, prog)
              }
            }
            endTour()
          }
          break
        }

        case EVENTS.TARGET_NOT_FOUND: {
          // Gracefully skip steps whose targets don't exist on this page
          const stepId = (step as { step?: string })?.step
          if (stepId && activeTrack) {
            completeStep(stepId) // treat as completed (skipped)
          }
          break
        }
      }
    },
    [activeTrack, completeStep, endTour, progress, saveProgress]
  )

  // ── No track or no wallet → render nothing ────────────────────────────────
  if (!track || !walletAddress) return null

  const steps = toJoyrideSteps(TUTORIAL_TRACKS[track] ?? [])

  // ── Empty steps array guard ────────────────────────────────────────────────
  if (steps.length === 0) return null

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      stepIndex={currentStep}
      continuous
      scrollToFirstStep={false}
      styles={JOYRIDE_STYLES}
      onEvent={handleJoyrideEvent}
    />
  )
}

// ─── Replay hook (consumed by profile/help surfaces) ───────────────────────────

/**
 * Returns a replay function for a given track.
 * Call this from any component that offers a "Restart Tutorial" button.
 *
 * Usage:
 *   const replayOwner = useReplayTrack("owner")
 *   <button onClick={() => replayOwner()}>Replay Owner Tour</button>
 */
export function useReplayTrack(track: TutorialTrack) {
  const { replayTour } = useTutorialStore()
  return useCallback(() => {
    replayTour(track)
  }, [replayTour, track])
}

// ─── Clear tutorial on logout helper ─────────────────────────────────────────

/**
 * Call this from the logout flow to clear all tutorial state.
 * This ensures no stale progress leaks between sessions.
 */
export function clearAllTutorialProgress() {
  const { clearProgress } = useTutorialStore.getState()
  clearProgress("owner")
  clearProgress("observer")
  clearProgress("voter")
}
