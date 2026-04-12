/**
 * DVote Frontend — Application Root Component
 *
 * Phase E placeholder: demonstrates AppShell with mock role and data.
 * Will be replaced in Phase F with TanStack Router route-tree integration.
 *
 * Tab title is set per-page via useDocumentTitle hook.
 */

import { AppShell } from "@/components/layout/AppShell"
import { PublicShell } from "@/components/layout/PublicShell"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { StatusChip } from "@/components/ui/StatusChip"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { Spinner } from "@/components/ui/Spinner"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

// Phase E build smoke-test: renders public + authenticated shells with mock data
export default function App() {
  // Tab title convention check: "DVote - Home" on landing
  useDocumentTitle("Home")

  // Remove showAuth to see PublicShell
  const showAuth = false

  if (!showAuth) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-10">
          {/* Hero heading */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              <span className="text-primary">D</span>Vote
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              A Decentralized Serverless Voting System — transparent, secure, and verifiable.
            </p>
          </div>

          {/* Phase E smoke test: component gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Status chips */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Election Statuses
              </h2>
              <div className="flex flex-wrap gap-2">
                <StatusChip status="Draft" />
                <StatusChip status="RegistrationOpen" />
                <StatusChip status="VotingOpen" />
                <StatusChip status="VotingClosed" />
                <StatusChip status="Finalized" />
                <StatusChip status="Superseded" />
              </div>
            </div>

            {/* KYC statuses */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                KYC Statuses
              </h2>
              <div className="flex flex-wrap gap-2">
                <StatusChip status="Pending" />
                <StatusChip status="UnderReview" />
                <StatusChip status="Approved" />
                <StatusChip status="Rejected" />
                <StatusChip status="ResubmissionRequired" />
              </div>
            </div>

            {/* Spinners */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Loading States
              </h2>
              <div className="flex items-center gap-4">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" color="secondary" />
                <Spinner size="xl" color="muted" />
              </div>
              <LoadingButton isLoading size="sm">Submit KYC</LoadingButton>
            </div>
          </div>

          {/* Skeleton cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Loading Skeletons (CDM-4 Guard)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SkeletonCard variant="stat" />
              <SkeletonCard variant="card" />
              <SkeletonCard variant="list" />
              <SkeletonCard variant="profile" />
            </div>
          </div>
        </div>
      </PublicShell>
    )
  }

  // Authenticated shell demo (set showAuth=true locally to test)
  return (
    <AppShell
      role="Voter"
      activePath="/elections"
      pageTitle="Elections"
      unreadCount={3}
    >
      <div className="space-y-4">
        <SkeletonCard variant="card" />
        <SkeletonCard variant="list" />
      </div>
    </AppShell>
  )
}
