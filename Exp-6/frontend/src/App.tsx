/**
 * DVote Frontend — Application Root Component
 *
 * Phase F: Mounts RouterProvider with live auth context injection.
 *
 * Auth context injection pattern (TanStack Router v1):
 *   - router instance is NEVER recreated on auth state change
 *   - context prop on RouterProvider injects live auth state
 *   - Guards in beforeLoad read context.auth.* for decisions
 *
 * Auth state flows from useAuthStore (Zustand in-memory store):
 *   - isHydrated: true once startup GET /auth/me check completes (Phase H)
 *   - isAuthenticated: true when accessToken + role both present
 *   - role: resolved from GET /api/v1/auth/me — NEVER from JWT claims
 *   - walletAddress: connected EVM checksum address
 *
 * Phase F: isHydrated is set to true immediately for scaffold purposes.
 * Phase H will replace this with real session hydration via useSession hook.
 *
 * Authority: walkthrough Phase F, §6 (RouterProvider context injection)
 */

import { RouterProvider } from "@tanstack/react-router"
import { router } from "@/app/router"
import { useAuthStore } from "@/state/auth-store"
import { useGovernanceStore } from "@/state/governance-store"

export default function App() {
  // Read live auth state from in-memory Zustand store.
  // This is the ONLY place router context is hydrated from.
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const walletAddress = useAuthStore((s) => s.walletAddress)

  // Phase I: governance state from polling hook (via GovernanceWatcher in providers.tsx)
  const governanceState = useGovernanceStore((s) => s.governanceState)

  return (
    <RouterProvider
      router={router}
      // Inject live auth context without re-creating router.
      // All beforeLoad guards receive this as context.auth.
      context={{
        auth: {
          isHydrated,
          isAuthenticated,
          role,
          walletAddress,
          governanceState,
        },
      }}
    />
  )
}
