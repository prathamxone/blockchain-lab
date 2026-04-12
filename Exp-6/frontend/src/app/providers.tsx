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

import "sonner/dist/index.css"
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
      // Navigate to landing (hard redirect — above router tree)
      window.location.replace("/")
    }
  }, [isConnected, isAuthenticated, clearSession])

  return null // No UI — pure effect
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
            {/* Global toast notifications */}
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
            {children}
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
