/**
 * DVote Frontend — Application Entry Point
 *
 * Wires the global provider tree (wagmi, query, rainbowkit) and mounts the
 * React application root.
 *
 * Provider wrapping order: WagmiProvider → QueryClientProvider → RainbowKitProvider
 * (enforced inside <Providers> — see src/app/providers.tsx)
 *
 * Phase F scaffold: setHydrated() is called immediately before render so the
 * router guard skips the "not hydrated" branch (no blocking skeleton on first load).
 * Phase H replaces this with real session hydration via useSession hook
 * (GET /api/v1/auth/me → setSession or clearSession → setHydrated).
 */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import { Providers } from "@/app/providers"
import App from "@/App"
import { useAuthStore } from "@/state/auth-store"

// PHASE F SCAFFOLD: Mark hydration as complete immediately.
// REPLACE IN PHASE H: real hydration calls GET /auth/me, then setHydrated().
useAuthStore.getState().setHydrated()

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("[DVote] #root element not found in index.html")
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)
