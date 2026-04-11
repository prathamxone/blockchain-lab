/**
 * DVote Frontend — Application Entry Point
 *
 * Wires the global provider tree (wagmi, query, rainbowkit) and mounts the
 * React application root.
 *
 * Provider wrapping order: WagmiProvider → QueryClientProvider → RainbowKitProvider
 * (enforced inside <Providers> — see src/app/providers.tsx)
 */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import { Providers } from "@/app/providers"
import App from "@/App"

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
