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
 * Authority: FEATURE_FRONTEND §4.4 + walkthrough Phase C pause-and-reflect §1
 */

import "@rainbow-me/rainbowkit/styles.css"

import { WagmiProvider } from "wagmi"
import { QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit"

import { wagmiConfig } from "@/config/wagmi"
import { queryClient } from "@/config/query-client"

// DVote uses light mode only (no dark mode in MVP — FEATURE_FRONTEND §1.3)
const dvoteRainbowKitTheme = lightTheme({
  accentColor: "#E87F24",        // Saffron — DVote tri-color primary accent
  accentColorForeground: "white",
  borderRadius: "medium",
  fontStack: "system",
})

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={dvoteRainbowKitTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
