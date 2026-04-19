/**
 * DVote Frontend — Voter/Candidate Dashboard
 *
 * Role-aware dashboard for Voter and Candidate roles.
 *
 * Policy L-E1 (walkthrough Phase Q §6):
 *   If role === "Candidate" AND KYC state is SUBMITTED | QUEUED | UNDER_REVIEW,
 *   show "Candidate Pending Review" state instead of voter dashboard.
 *
 * This reflects the user's candidate KYC is under ECI/RO review and they
 * cannot perform candidate actions until approved.
 *
 * Authority: walkthrough Phase Q §6, CDM-15
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { kycStatusLabel, type KycStatus } from "@/lib/format/mask"
import { fetchVoterKycStatus } from "./api"
import type { VoterKycStatus } from "./api"
import { useAuthStore } from "@/state/auth-store"

// ─── Types ────────────────────────────────────────────────────────────────────

/** KYC states that indicate candidate KYC is pending ECI review */
const PENDING_REVIEW_STATES: KycStatus[] = [
  "SUBMITTED",
  "QUEUED",
  "UNDER_REVIEW",
]

// ─── Candidate Pending Review Banner ──────────────────────────────────────────

interface CandidatePendingBannerProps {
  kycStatus: VoterKycStatus
}

function CandidatePendingBanner({ kycStatus }: CandidatePendingBannerProps) {
  const statusLabel = kycStatusLabel(kycStatus.state)

  return (
    <Card className="border-dvote-saffron/50 bg-dvote-saffron-subtle/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dvote-saffron/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-dvote-saffron"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Candidate Pending Review
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your candidate application is being reviewed by the Election Commission
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Application Status:</span>
          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        {kycStatus.submittedAt && (
          <p className="text-xs text-muted-foreground">
            Submitted:{" "}
            {new Date(kycStatus.submittedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          You will be able to perform candidate actions once your KYC is approved.
          Voter functionality remains available while you wait.
        </p>
        <div className="flex gap-2 pt-1">
          <a
            href="/elections"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            View Elections
          </a>
          <a
            href="/results"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            View Results
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Voter Dashboard ──────────────────────────────────────────────────────────

interface VoterDashboardProps {
  walletAddress: string
}

function VoterDashboard({ walletAddress }: VoterDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Wallet Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">My Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm text-muted-foreground">
            {walletAddress}
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Elections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Browse active and upcoming elections
            </p>
            <a
              href="/elections"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              View Elections
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              View finalized election results
            </p>
            <a
              href="/results"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              View Results
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Manage your identity and documents
            </p>
            <a
              href="/profile"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              My Profile
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Voting Guidance */}
      <Card className="border-dvote-green/30 bg-dvote-green-subtle/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-dvote-green">
            How Voting Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>1. Browse elections on the Elections page</p>
          <p>2. Select an election with status "VotingOpen" to cast your vote</p>
          <p>3. Your vote is secured with a 60-second token window</p>
          <p>4. Vote is final and cannot be changed after submission</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────────────────

export function VoterDashboardPage() {
  const role = useAuthStore((s) => s.role)
  const walletAddress = useAuthStore((s) => s.walletAddress)

  const [kycStatus, setKycStatus] = useState<VoterKycStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchVoterKycStatus()
      .then((data) => {
        if (!cancelled) {
          setKycStatus(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load KYC status")
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome to DVote — your decentralized voting portal
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  // Error state — show voter dashboard even if KYC fetch fails
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome to DVote — your decentralized voting portal
          </p>
        </div>
        <VoterDashboard walletAddress={walletAddress ?? ""} />
      </div>
    )
  }

  // Policy L-E1: Candidate with pending KYC — show pending banner instead of voter dashboard
  const showPendingBanner =
    role === "Candidate" &&
    kycStatus !== null &&
    PENDING_REVIEW_STATES.includes(kycStatus.state)

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome to DVote — your decentralized voting portal
        </p>
      </div>

      {showPendingBanner && kycStatus && (
        <CandidatePendingBanner kycStatus={kycStatus} />
      )}

      <VoterDashboard walletAddress={walletAddress ?? ""} />
    </div>
  )
}
