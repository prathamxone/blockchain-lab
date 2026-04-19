/**
 * DVote Frontend — AnomalyReportForm Component
 *
 * Observer-facing form to submit anomaly reports.
 *
 * Policy L-E2: No file upload round-trip.
 *
 * Rate limit (backend):
 *   10 submissions per 15-minute window per wallet.
 *   Backend returns 429 on breach — shows "Try again later" guidance.
 *
 * Backend contract:
 *   POST /observer/anomalies
 *   Body: { electionId, category, detail, constituencyId? }
 *   Roles: ADMIN, ECI, SRO, RO, OBSERVER
 *
 * Authority: walkthrough Phase R §4, FEATURE_FRONTEND §10.4
 */

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient, ApiError } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

const ANOMALY_CATEGORIES = [
  { value: "DUPLICATE_IDENTITY_SUSPICION", label: "Duplicate Identity Suspicion" },
  { value: "VOTE_SPIKE_SHORT_WINDOW", label: "Vote Spike in Short Window" },
  { value: "INFRASTRUCTURE_OUTAGE_OR_DEGRADATION", label: "Infrastructure Outage or Degradation" },
  { value: "UNAUTHORIZED_ADMIN_ACTION_ATTEMPT", label: "Unauthorized Admin Action Attempt" },
  { value: "KYC_REVIEW_MANIPULATION_SUSPICION", label: "KYC Review Manipulation Suspicion" },
]

interface AnomalyReportFormProps {
  electionId: string
  constituencyId?: string
  onSuccess?: (anomalyId: string) => void
}

interface FormState {
  category: string
  detail: string
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AnomalyReportForm({
  electionId,
  constituencyId,
  onSuccess,
}: AnomalyReportFormProps) {
  const [form, setForm] = useState<FormState>({ category: "", detail: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [anomalyId, setAnomalyId] = useState<string | null>(null)

  function updateCategory(value: string) {
    setForm((f) => ({ ...f, category: value }))
    setError(null)
    setRateLimited(false)
  }

  function updateDetail(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, detail: event.target.value }))
    setError(null)
    setRateLimited(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.detail.trim()) {
      setError("Category and description are required.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setRateLimited(false)

    try {
      const payload: Record<string, string> = {
        electionId,
        category: form.category,
        detail: form.detail.trim(),
      }
      if (constituencyId) {
        payload.constituencyId = constituencyId
      }

      const result = await apiClient.post<{ anomalyId: string }>(
        "/observer/anomalies",
        payload
      )

      setAnomalyId(result.anomalyId)
      setSubmitted(true)
      setForm({ category: "", detail: "" })
      onSuccess?.(result.anomalyId)
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 429) {
        setRateLimited(true)
        setError("Rate limit reached. You can submit up to 10 anomaly reports per 15-minute window.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit anomaly report.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="border-dvote-green/40 bg-dvote-green-subtle/20">
        <CardContent className="py-8 text-center">
          <div className="mb-3 flex justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-dvote-green"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 12 15 16 10" />
            </svg>
          </div>
          <p className="text-base font-medium text-foreground">Anomaly Reported</p>
          {anomalyId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: {anomalyId.slice(0, 8)}...
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            The ECI review team will assess your report.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setSubmitted(false)}
          >
            Report another
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Report Anomaly</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Observers can report suspicious activity for ECI review. Up to 10 reports per 15-minute window.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="anomaly-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={form.category} onValueChange={(val) => updateCategory(val ?? "")}>
              <SelectTrigger id="anomaly-category">
                <SelectValue placeholder="Select anomaly category" />
              </SelectTrigger>
              <SelectContent>
                {ANOMALY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detail */}
          <div className="space-y-2">
            <Label htmlFor="anomaly-detail">
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="anomaly-detail"
              value={form.detail}
              onChange={updateDetail}
              placeholder="Describe the observed anomaly in detail..."
              rows={4}
              maxLength={1000}
              required
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.detail.length}/1000
            </p>
          </div>

          {/* Error */}
          {error && (
            <p
              className={`text-sm ${rateLimited ? "text-dvote-saffron" : "text-destructive"}`}
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !form.category ||
              !form.detail.trim() ||
              rateLimited
            }
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>

          {rateLimited && (
            <p className="text-center text-xs text-dvote-saffron">
              Try again in 15 minutes or contact support if urgent.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
