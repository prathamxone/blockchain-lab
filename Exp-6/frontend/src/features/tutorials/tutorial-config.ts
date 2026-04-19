/**
 * DVote Frontend — Tutorial Configuration
 *
 * Joyride step configurations for all three role-based tutorial tracks:
 * - Owner track: KYC queue management, election lifecycle, rerun/escalation
 * - Observer track: aggregate views, anomaly reporting, election monitoring
 * - Voter/Candidate track: election browsing, voting, results, profile
 *
 * Tutorial tracks are keyed by role and include role-specific navigation
 * highlights, critical actions, and help entry points.
 *
 * CDM-16 enforcement: TutorialOrchestrator keys progress by wallet+role+appVersion.
 * A wallet-only key causes role collision for users who switch roles.
 *
 * Authority: walkthrough Phase S, FEATURE_FRONTEND §11
 */

import type { DVoteRole } from "@/components/layout/Sidebar"

// ─── Types ────────────────────────────────────────────────────────────────────

export type TutorialTrack = "owner" | "observer" | "voter"

export interface TutorialStep {
  /** Joyride step identifier */
  step: string
  /** CSS selector for the target element */
  target: string
  /** Headline shown in the tooltip */
  title: string
  /** Body text shown in the tooltip */
  content: string
  /** Tooltip placement relative to target */
  placement?:
    | "top"
    | "top-start"
    | "top-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end"
    | "right"
    | "right-start"
    | "right-end"
    | "center"
  /** Whether this step requires the element to be visible */
  requiresVisible?: boolean
  /** Whether to disable interactive elements during this step */
  disableBeacon?: boolean
}

// ─── Owner Track ───────────────────────────────────────────────────────────────

const OWNER_STEPS: TutorialStep[] = [
  {
    step: "owner-welcome",
    target: "#sidebar",
    title: "Welcome, Owner",
    content:
      "As an Owner, you manage the entire DVote election system. This tour covers your key responsibilities.",
    placement: "right",
    disableBeacon: true,
  },
  {
    step: "owner-kvc-queue",
    target: "#admin-kyc-queue-link",
    title: "KYC Review Queue",
    content:
      "Review voter and candidate KYC applications here. Approve valid submissions or request resubmission with a reason.",
    placement: "right",
  },
  {
    step: "owner-elections",
    target: 'a[href="/elections"]',
    title: "Election Management",
    content:
      "Browse all elections, check their status, and trigger finalization when voting closes.",
    placement: "bottom",
  },
  {
    step: "owner-rerun",
    target: 'a[href*="/lineage"]',
    title: "Rerun & Escalation",
    content:
      "Monitor rerun SLA deadlines. If a rerun is triggered and SLA is breached, escalate to ECI through the escalation flow.",
    placement: "top",
  },
  {
    step: "owner-results",
    target: 'a[href="/results"]',
    title: "Election Results",
    content:
      "View finalized results for all elections. Outcomes include candidate wins, NOTA-triggered reruns, and tie-lot resolutions.",
    placement: "bottom",
  },
  {
    step: "owner-help",
    target: 'a[href="/profile"]',
    title: "Profile & Help",
    content:
      "Update your profile, change your photo, and replay this tutorial at any time from your profile page.",
    placement: "top",
  },
]

// ─── Observer Track ─────────────────────────────────────────────────────────────

const OBSERVER_STEPS: TutorialStep[] = [
  {
    step: "observer-welcome",
    target: "#sidebar",
    title: "Welcome, Observer",
    content:
      "As an Observer, you monitor election integrity without making decisions. This tour covers your aggregate-only views.",
    placement: "right",
    disableBeacon: true,
  },
  {
    step: "observer-dashboard",
    target: "#observer-dashboard-link",
    title: "Observer Dashboard",
    content:
      "View aggregate KYC statistics and election-level summaries. No individual voter or candidate data is exposed.",
    placement: "right",
  },
  {
    step: "observer-anomalies",
    target: "#observer-anomalies-link",
    title: "Report Anomalies",
    content:
      "If you observe suspicious activity, use the anomaly report form. Be specific: include election ID, time window, and nature of the anomaly.",
    placement: "right",
  },
  {
    step: "observer-elections",
    target: 'a[href="/elections"]',
    title: "Election Monitoring",
    content:
      "Browse elections to observe their status, voting activity, and finalization outcomes.",
    placement: "bottom",
  },
  {
    step: "observer-results",
    target: 'a[href="/results"]',
    title: "Results Observation",
    content:
      "View finalized results. Observers cannot vote but can track election outcomes for transparency.",
    placement: "bottom",
  },
  {
    step: "observer-profile",
    target: 'a[href="/profile"]',
    title: "Profile & Help",
    content:
      "Replay this tutorial or contact ECI support from your profile page.",
    placement: "top",
  },
]

// ─── Voter/Candidate Track ───────────────────────────────────────────────────────

const VOTER_STEPS: TutorialStep[] = [
  {
    step: "voter-welcome",
    target: "#sidebar",
    title: "Welcome to DVote",
    content:
      "DVote is India's decentralized voting platform. This tour guides you through your voter experience.",
    placement: "right",
    disableBeacon: true,
  },
  {
    step: "voter-elections",
    target: 'a[href="/elections"]',
    title: "Browse Elections",
    content:
      "View all active and upcoming elections. Select one with status 'VotingOpen' to cast your vote.",
    placement: "bottom",
  },
  {
    step: "voter-vote",
    target: 'a[href="/vote"]',
    title: "Cast Your Vote",
    content:
      "Your vote is protected by a 60-second token window. Once confirmed, your vote is final and cannot be changed.",
    placement: "bottom",
  },
  {
    step: "voter-results",
    target: 'a[href="/results"]',
    title: "View Results",
    content:
      "After finalization, election results show the winner, vote counts, and whether a NOTA-triggered rerun occurred.",
    placement: "bottom",
  },
  {
    step: "voter-inbox",
    target: 'a[href="/inbox"]',
    title: "Notifications",
    content:
      "Receive updates about KYC status, election status changes, and result declarations in your inbox.",
    placement: "bottom",
  },
  {
    step: "voter-profile",
    target: 'a[href="/profile"]',
    title: "Profile & KYC",
    content:
      "Manage your identity documents, update your photo, and track your KYC status. Replay this tutorial anytime from here.",
    placement: "top",
  },
]

// ─── Track map ─────────────────────────────────────────────────────────────────

export const TUTORIAL_TRACKS: Record<TutorialTrack, TutorialStep[]> = {
  owner: OWNER_STEPS,
  observer: OBSERVER_STEPS,
  voter: VOTER_STEPS,
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Map DVoteRole to TutorialTrack */
export function roleToTrack(role: DVoteRole): TutorialTrack {
  if (role === "Owner") return "owner"
  if (role === "Observer") return "observer"
  return "voter"
}

/** Convert TutorialStep to react-joyride Step format */
export function toJoyrideSteps(steps: TutorialStep[]): import("react-joyride").Step[] {
  return steps.map((s) => ({
    target: s.target,
    title: s.title,
    content: s.content,
    placement: s.placement ?? "bottom",
    disableBeacon: s.disableBeacon ?? false,
    // Custom field stored on the step object for progress tracking
    step: s.step,
    // Allow skipping individual steps
    disableOverlayClose: false,
    // Show a skip button on every step
    showSkipButton: true,
  }))
}
