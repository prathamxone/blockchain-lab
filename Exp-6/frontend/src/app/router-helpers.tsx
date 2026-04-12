/**
 * DVote Frontend — Router Helper Components
 *
 * Extracted from router.tsx to satisfy react-refresh/only-export-components
 * ESLint rule. router.tsx exports a non-component (the router instance), so
 * any React component functions must live in a separate file.
 *
 * Exports:
 *   - PageSuspense: thin Suspense boundary for lazy-loaded route chunks
 *   - PlaceholderPage: stub UI for routes not yet implemented (Phase H → Q)
 *
 * Authority: walkthrough Phase G §router, FEATURE_FRONTEND §5
 */

import { Suspense } from "react"

// ─── PageSuspense ─────────────────────────────────────────────────────────────
// Wraps lazy-imported page components. Shows a small centered spinner while
// the route chunk loads. Prevents white-screen flash on code-split navigation.

export function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

// ─── PlaceholderPage ──────────────────────────────────────────────────────────
// Stub surface for routes belonging to future phases (Phase H → Q).
// Title prop is the human-readable page name passed from the route definition.

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
      <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
        <span className="text-lg font-bold text-muted-foreground">⏳</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground text-sm max-w-xs">
        This page is coming soon — implementation in progress.
      </p>
    </div>
  )
}
