/**
 * DVote Frontend — Application Entry Point
 *
 * Wires the global provider tree (wagmi, query, rainbowkit) and mounts the
 * React application root.
 *
 * Provider wrapping order: WagmiProvider → QueryClientProvider → RainbowKitProvider
 * (enforced inside <Providers> — see src/app/providers.tsx)
 *
 * Phase H: Session hydration is now handled by SessionHydrator inside providers.tsx.
 *   SessionHydrator calls useSession (POST /auth/refresh → GET /auth/me) which
 *   calls setHydrated() after the attempt, allowing router guards to unblock.
 *   The Phase F scaffold stub (setHydrated() called immediately) is removed.
 */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import { Providers } from "@/app/providers"
import App from "@/App"

// Phase F scaffold removed (setHydrated() stub).
// Real hydration: SessionHydrator → useSession → POST /auth/refresh → GET /auth/me → setHydrated()

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
