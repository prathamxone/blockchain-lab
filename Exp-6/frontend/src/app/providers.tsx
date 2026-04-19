/**
 * DVote Frontend — Global Provider Composition Tree
 *
 * Wrapping order is mandatory (CDM-4 guard):
 *   WagmiProvider → QueryClientProvider → RainbowKitProvider → children
 *
 * Rationale:
 * - WagmiProvider must be outermost because wagmi hooks need wagmi context.
 * - QueryClientProvider must wrap RainbowKitProvider because RainbowKit uses
 *   @tanstack/react-query internally for async wallet state management.
 * - RainbowKitProvider must be innermost of the three to receive both contexts.
 *
 * Incorrect wrapping order causes "No QueryClient set" or "No Wagmi context"
 * errors in RainbowKit's internal hooks.
 *
 * Phase G: Added DisconnectWatcher component to enforce Policy L-B2:
 *   Wallet disconnect → clearSession (in-memory token cleared) → navigate to /
 *   This prevents stale authenticated sessions when the user manually disconnects.
 *
 * Authority: FEATURE_FRONTEND §4.4 + walkthrough Phase C pause-and-reflect §1
 *            BACKEND_HANDOFF_REPORT §9.1 rule 9 (L-B1/L-B2 security policy)
 */

import "@rainbow-me/rainbowkit/styles.css"

import { useEffect, useRef } from "react"
import { WagmiProvider, useAccount } from "wagmi"
import { QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit"
import { Toaster } from "sonner"

import { wagmiConfig } from "@/config/wagmi"
import { queryClient } from "@/config/query-client"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuthStore } from "@/state/auth-store"
import { useGovernanceStore } from "@/state/governance-store"
import { useFreshnessStore } from "@/state/freshness-store"
import { useSession } from "@/hooks/useSession"
import { useTokenRefresh } from "@/hooks/useTokenRefresh"
import { useWalletGovernance } from "@/hooks/useWalletGovernance"
import { useFreshness } from "@/hooks/useFreshness"
import { TutorialOrchestrator, clearAllTutorialProgress } from "@/features/tutorials/TutorialOrchestrator"

// DVote uses light mode only (no dark mode in MVP — FEATURE_FRONTEND §1.3)
const dvoteRainbowKitTheme = lightTheme({
  accentColor: "#E87F24",        // Saffron — DVote tri-color primary accent
  accentColorForeground: "white",
  borderRadius: "medium",
  fontStack: "system",
})

// ─── DisconnectWatcher ────────────────────────────────────────────────────────
//
// Policy L-B2: Wallet disconnect → clear in-memory session → redirect to /.
// Uses useAccount to watch the `isConnected` flag.
// When transitioning from connected → disconnected while authenticated,
// clear session and navigate to landing.
//
// Must be placed INSIDE WagmiProvider to access wagmi hooks.
// Navigation uses window.location.replace (cannot use useNavigate here —
// this component is above the RouterProvider in the tree).

function DisconnectWatcher() {
  const { isConnected } = useAccount()
  const clearSession = useAuthStore((s) => s.clearSession)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Track previous connection state to detect transitions
  const wasConnectedRef = useRef(isConnected)

  useEffect(() => {
    const wasConnected = wasConnectedRef.current
    wasConnectedRef.current = isConnected

    // Detect disconnect transition: was connected → now disconnected
    if (wasConnected && !isConnected && isAuthenticated) {
      // L-B2: clear in-memory token immediately
      clearSession()
      // Phase I: clear governance state on wallet disconnect
      useGovernanceStore.getState().clearGovernanceState()
      // Phase J: clear freshness state on wallet disconnect
      useFreshnessStore.getState().clearFreshness()
      // Phase S: clear all tutorial progress on logout/disconnect
      clearAllTutorialProgress()
      // Navigate to landing (hard redirect — above router tree)
      window.location.replace("/")
    }
  }, [isConnected, isAuthenticated, clearSession])

  return null // No UI — pure effect
}

// ─── SessionHydrator ──────────────────────────────────────────────────────────
//
// Phase H: Startup session hydration + proactive token refresh.
//
// Pure-effect component (renders null) that:
//   1. useSession: POST /auth/refresh → GET /auth/me → setSession/setHydrated
//   2. useTokenRefresh: wires wireUnauthorizedHandler + schedules proactive renewal
//
// Mounted inside the provider tree (inside TooltipProvider) so all contexts
// are available at the point of mounting.

function SessionHydrator() {
  useSession()
  useTokenRefresh()
  return null
}

// ─── GovernanceWatcher ────────────────────────────────────────────────────
//
// Phase I: Wallet governance status polling.
// Pure-effect component (renders null) that mounts useWalletGovernance.
//
// Polls GET /api/v1/wallet/status on:
//   1. Session authentication (isAuthenticated becomes true)
//   2. Wagmi wallet account change
//
// Writes governance state into governance-store for:
//   - WalletLockBanner (visual layer in AppShell)
//   - router beforeLoad guard (hard route block)

function GovernanceWatcher() {
  useWalletGovernance()
  return null
}

// ─── FreshnessWatcher ─────────────────────────────────────────────────────────
//
// Phase J: System freshness polling.
// Pure-effect component (renders null) that mounts useFreshness.
//
// Polls GET /api/v1/system/freshness on:
//   1. Session authentication (isAuthenticated becomes true)
//   2. Tab visibility change (visibilitychange event)
//
// Active tab: 15s cadence. Background tab: 60s cadence.
// Focus return → immediate refetch.
//
// Writes freshness state to freshness-store for:
//   - FreshnessBanner (visual layer in AppShell)
//   - useSensitiveActionGate (CDM-9 gate layer with 5s debounce)

function FreshnessWatcher() {
  useFreshness()
  return null
}

// ─── Providers component ──────────────────────────────────────────────────────

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={dvoteRainbowKitTheme}>
          <TooltipProvider>
            {/* L-B2: wallet disconnect listener — must be inside WagmiProvider */}
            <DisconnectWatcher />
            {/* Phase H: startup hydration + proactive token refresh */}
            <SessionHydrator />
            {/* Phase I: wallet governance status polling */}
            <GovernanceWatcher />
            {/* Phase J: system freshness polling (15s active / 60s background) */}
            <FreshnessWatcher />
            {/* Global toast notifications */}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
            {/* Phase S: Guided tutorial overlay — auto-starts on first role visit */}
            <TutorialOrchestrator />
            {children}
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
