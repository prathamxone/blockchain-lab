/**
 * DVote Frontend — Full TanStack Router v1 Route Tree (Code-Based)
 *
 * Route tree covers ALL canonical route spaces from FEATURE_FRONTEND §5.1:
 *
 *   PUBLIC (no auth):
 *     /                    — Landing page (WalletConnect CTA)
 *     /login               — Post-connect: challenge → sign → verify (Phase G)
 *     /unauthorized        — Explicit role-denial surface
 *     /not-found           — 404 fallback
 *     (all other paths)    — 404 redirect
 *
 *   PROTECTED (require authenticated session + resolved role):
 *     /_authenticated      — Layout guard: session + role check + wallet governance
 *       /admin             — Owner role home (admin shell)
 *       /admin/kyc-queue   — KYC submission review queue
 *       /observer          — Observer role home
 *       /observer/anomalies — Anomaly report list
 *       /voter             — Voter/Candidate role home
 *       /vote              — Cast vote (VotingOpen elections only)
 *       /candidacy         — Candidate profile management
 *       /_app              — Inner layout: shared auth routes
 *         /elections       — Election discovery list (all authenticated roles)
 *         /elections/:uelectionid — Election detail
 *         /elections/:uelectionid/lineage — Parent-child rerun lineage
 *         /results         — Result listing
 *         /results/:uelectionid — Election-specific result
 *         /profile         — User profile + photo + KYC status
 *         /inbox           — Notification inbox
 *
 * Guard strategy (CDM-4 — FEATURE_FRONTEND §5.2):
 *   All guards run in beforeLoad — NEVER inside component body.
 *   Guards check: session presence → role resolve → role-route compat.
 *   Wallet governance lock checked separately in Phase I.
 *
 * Auth context is injected via RouterProvider context prop (not re-created).
 *
 * Authority: FEATURE_FRONTEND §5.1–5.4, walkthrough Phase F
 */

import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router"
import { lazy } from "react"

import type { DVoteRole } from "@/components/layout/Sidebar"
import {
  validateLoginSearch,
  validateElectionsSearch,
  validateResultsSearch,
  validateKycQueueSearch,
  validateInboxSearch,
  getRoleHome,
} from "@/lib/url-state"
import { PageSuspense, PlaceholderPage } from "@/app/router-helpers"
import type { WalletGovernanceState } from "@/state/governance-store"
import { isGovernanceLocked } from "@/state/governance-store"

// ─── Router Context Type ──────────────────────────────────────────────────────

/**
 * Auth state injected into every route's `context` via RouterProvider.
 * Guards access context.auth.* to make redirect decisions.
 * NEVER read role from JWT claims — only from context.auth.role.
 */
export interface DVoteRouterContext {
  auth: {
    /** True when startup hydration has completed (GET /auth/me attempted). */
    isHydrated: boolean
    /** True when accessToken + role are both present. */
    isAuthenticated: boolean
    /** Role resolved from GET /api/v1/auth/me response. null while loading. */
    role: DVoteRole | null
    /** EVM checksum wallet address. */
    walletAddress: string | null
    /**
     * Wallet governance state from GET /api/v1/wallet/status.
     * null = not yet fetched. "none" = no lock (happy path).
     * Phase I: used by beforeLoad guard to redirect locked sessions.
     */
    governanceState: WalletGovernanceState | null
  }
}

// ─── Lazy-loaded page components ─────────────────────────────────────────────
// Phase G: real auth pages. Lazy-imports for code splitting.
// Phase G→Q: other placeholders replaced per phase.
// PageSuspense + PlaceholderPage are imported from router-helpers.tsx
// (extracted to satisfy react-refresh/only-export-components rule).

const LandingPage = lazy(() => import("@/features/auth/LandingPage"))
const LoginPage   = lazy(() => import("@/features/auth/LoginPage"))
const KycWizardPageLazy = lazy(() =>
  import("@/features/kyc/KycWizardPage").then((m) => ({ default: m.KycWizardPage }))
)
const ProfilePageLazy = lazy(() =>
  import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage }))
)

// ─── Root Route ───────────────────────────────────────────────────────────────

const rootRoute = createRootRouteWithContext<DVoteRouterContext>()({
  component: () => <Outlet />,
  // Global 404: renders branded not-found page (Phase E shell wraps it via _app)
  notFoundComponent: () => <PlaceholderPage title="DVote — Page Not Found (404)" />,
})

// ─── Public: Landing ( / ) ────────────────────────────────────────────────────
// Phase G: wired to real LandingPage component.

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <PageSuspense>
      <LandingPage />
    </PageSuspense>
  ),
})

// ─── Public: Login ( /login ) ─────────────────────────────────────────────────
// Phase G: wired to real LoginPage component.

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: validateLoginSearch,
  component: () => (
    <PageSuspense>
      <LoginPage />
    </PageSuspense>
  ),
})

// ─── Public: Unauthorized ( /unauthorized ) ────────────────────────────────────

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unauthorized",
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
      <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
      <p className="text-muted-foreground max-w-sm">
        You do not have permission to access this page.
        Please contact your system administrator or return to your dashboard.
      </p>
      <a href="/" className="text-primary underline underline-offset-4 text-sm">
        Return to Home
      </a>
    </div>
  ),
})

// ─── Public: Not Found ( /not-found ) ─────────────────────────────────────────

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/not-found",
  component: () => <PlaceholderPage title="DVote — 404 Not Found" />,
})

// ─── Protected: _authenticated layout guard ───────────────────────────────────
//
// CDM-4: All auth guard logic lives in beforeLoad — NEVER in component body.
// This pathless layout route gates ALL protected child routes.
//
// Guard sequence:
//   1. If not hydrated yet → wait (component shows skeleton; guard is synchronous
//      so hydration must complete before route resolution — see app initialization)
//   2. If not authenticated → redirect to / (landing) with returnTo + reason
//   3. If role cannot be determined → redirect to / (safe re-auth)
//   4. Governance lock (Phase I wires this) → placeholder pass-through for now
//
// Note: governance lock check (GET /api/v1/wallet/status) is wired in Phase I.
// The beforeLoad guard signature below has a stub for that check.

const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ context, location }) => {
    const { isHydrated, isAuthenticated, role } = context.auth

    // Guard 1: Hydration — startup session check must complete before guard decisions.
    // If isHydrated is false, the app is still checking /auth/me.
    // Router is blocked from showing content until hydration completes.
    if (!isHydrated) {
      // Hydration check: component renders SkeletonShell (CDM-4 visual safety layer).
      // Guard itself cannot block here synchronously — AppShell handles skeleton gating.
      return
    }

    // Guard 2: Session presence — unauthenticated → redirect to landing with returnTo.
    if (!isAuthenticated) {
      throw redirect({
        to: "/",
        search: {
          returnTo: location.href,
          reason: "session_expired" as const,
        },
      })
    }

    // Guard 3: Role resolve — must have a resolved role.
    // Unresolved role signals a stale session or backend role sync error.
    if (!role) {
      throw redirect({
        to: "/",
        search: {
          returnTo: location.href,
          reason: "session_expired" as const,
        },
      })
    }
    // Governance lock (CDM-5, Phase I): block WalletMismatchLocked sessions from route entry.
    // Other lock states (PendingApproval, AwaitingRebind, Rejected) allow banners but not full block.
    // WalletLockBanner in AppShell provides the visual explanation for all states.
    if (isGovernanceLocked(context.auth.governanceState)) {
      // Only hard-block WalletMismatchLocked — it's the state requiring immediate action.
      // Other states get the banner treatment but allow read-only shell access.
      if (context.auth.governanceState === "WalletMismatchLocked") {
        throw redirect({ to: "/unauthorized" })
      }
    }
  },
  component: () => <Outlet />,
})

// ─── Protected: Admin shell ( /admin ) — Owner role only ──────────────────────

const adminIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/admin",
  beforeLoad: ({ context }) => {
    if (context.auth.role !== "Owner") {
      throw redirect({ to: getRoleHome(context.auth.role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — Admin Dashboard" />,
})

const adminKycQueueRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/admin/kyc-queue",
  validateSearch: validateKycQueueSearch,
  beforeLoad: ({ context }) => {
    if (context.auth.role !== "Owner") {
      throw redirect({ to: getRoleHome(context.auth.role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — KYC Review Queue" />,
})

// ─── Protected: Observer shell ( /observer ) — Observer role only ─────────────

const observerIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/observer",
  beforeLoad: ({ context }) => {
    if (context.auth.role !== "Observer") {
      throw redirect({ to: getRoleHome(context.auth.role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — Observer Dashboard" />,
})

const observerAnomaliesRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/observer/anomalies",
  beforeLoad: ({ context }) => {
    if (context.auth.role !== "Observer") {
      throw redirect({ to: getRoleHome(context.auth.role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — Anomaly Reports" />,
})

// ─── Protected: Voter/Candidate shell ( /voter ) ──────────────────────────────

const voterIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/voter",
  beforeLoad: ({ context }) => {
    const role = context.auth.role
    if (role !== "Voter" && role !== "Candidate") {
      throw redirect({ to: getRoleHome(role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — My Dashboard" />,
})

// ─── Protected: Vote cast ( /vote ) — Voter only ──────────────────────────────

const voteRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/vote",
  beforeLoad: ({ context }) => {
    if (context.auth.role !== "Voter") {
      throw redirect({ to: getRoleHome(context.auth.role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — Cast Vote" />,
})

// ─── Protected: Candidacy management ( /candidacy ) — Candidate only ─────────

const candidacyRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: "/candidacy",
  beforeLoad: ({ context }) => {
    if (context.auth.role !== "Candidate") {
      throw redirect({ to: getRoleHome(context.auth.role) })
    }
  },
  component: () => <PlaceholderPage title="DVote — My Candidacy" />,
})

// ─── Protected: _app inner layout (shared authenticated routes) ───────────────
//
// All roles can access /elections, /results, /inbox, /profile.
// Role-specific content within these pages is gated at component level.

const appLayoutRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  id: "_app",
  component: () => <Outlet />,
})

// ─── Protected: Elections list ( /elections ) — All authenticated roles ────────

const electionsIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/elections",
  validateSearch: validateElectionsSearch,
  component: () => <PlaceholderPage title="DVote — Elections" />,
})

// ─── Protected: Election detail ( /elections/:uelectionid ) ───────────────────

const electionDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/elections/$uelectionid",
  component: () => <PlaceholderPage title="DVote — Election Detail" />,
})

// ─── Protected: Election lineage ( /elections/:uelectionid/lineage ) ──────────

const electionLineageRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/elections/$uelectionid/lineage",
  component: () => <PlaceholderPage title="DVote — Election Lineage" />,
})

// ─── Protected: Results list ( /results ) ────────────────────────────────────

const resultsIndexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/results",
  validateSearch: validateResultsSearch,
  component: () => <PlaceholderPage title="DVote — Results" />,
})

// ─── Protected: Result detail ( /results/:uelectionid ) ──────────────────────

const resultDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/results/$uelectionid",
  component: () => <PlaceholderPage title="DVote — Result Detail" />,
})

// ─── Protected: Profile ( /profile ) — All authenticated roles ───────────────

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/profile",
  component: () => (
    <PageSuspense>
      <ProfilePageLazy />
    </PageSuspense>
  ),
})

// ─── Protected: KYC Wizard ( /kyc ) — Voter + Candidate only ────────────────
//
// Query params: ?electionId=xxx&constituencyId=xxx (required by KycWizardPage)
// Owner/Admin/Observer are redirected to their home pages.

const kycRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/kyc",
  beforeLoad: ({ context }) => {
    const role = context.auth.role
    if (role !== "Voter" && role !== "Candidate") {
      throw redirect({ to: getRoleHome(role) })
    }
  },
  component: () => (
    <PageSuspense>
      <KycWizardPageLazy />
    </PageSuspense>
  ),
})

// ─── Protected: Inbox ( /inbox ) — All authenticated roles ───────────────────

const inboxRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/inbox",
  validateSearch: validateInboxSearch,
  component: () => <PlaceholderPage title="DVote — Inbox" />,
})

// ─── Route Tree Assembly ──────────────────────────────────────────────────────
//
// TanStack Router requires explicit parent.addChildren() calls to build the tree.
// Order matters for matching; more-specific routes must be earlier.

const routeTree = rootRoute.addChildren([
  // Public routes
  indexRoute,
  loginRoute,
  unauthorizedRoute,
  notFoundRoute,

  // Protected: top-level guard layout with all child routes
  authenticatedLayoutRoute.addChildren([
    // Role-specific shells
    adminIndexRoute,
    adminKycQueueRoute,
    observerIndexRoute,
    observerAnomaliesRoute,
    voterIndexRoute,
    voteRoute,
    candidacyRoute,

    // Shared authenticated layout
    appLayoutRoute.addChildren([
      electionsIndexRoute,
      electionDetailRoute,
      electionLineageRoute,
      resultsIndexRoute,
      resultDetailRoute,
      profileRoute,
      kycRoute,
      inboxRoute,
    ]),
  ]),
])

// ─── Router Instance ──────────────────────────────────────────────────────────
//
// Context placeholder is filled at runtime by RouterProvider's `context` prop.
// This prevents router re-creation on auth state changes (preserves caches).
// Authority: TanStack Router v1 auth pattern — context injection via RouterProvider.

export const router = createRouter({
  routeTree,
  context: {
    // Placeholder — real auth state injected via <RouterProvider context={...} />
    auth: {
      isHydrated: false,
      isAuthenticated: false,
      role: null,
      walletAddress: null,
      governanceState: null,
    },
  },
  defaultPreload: "intent",   // Preload on hover for fast navigation
  scrollRestoration: true,    // Browser back/forward scroll restoration (§5.5)
})

// ─── Module Augmentation — Type-safe router globally ─────────────────────────
//
// Registers the router type so all TanStack Router hooks (useParams, useSearch,
// useNavigate, Link, etc.) are fully typed without explicit generic arguments.

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}


