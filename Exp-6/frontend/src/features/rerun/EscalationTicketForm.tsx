/**
 * DVote Frontend — Escalation Ticket Form
 *
 * Admin-only escalation ticket creation form.
 * After submission, the form transitions to IMMUTABLE read-only view (CDM-15).
 * No edit controls are shown post-submit.
 *
 * Features:
 * - Category selection (required)
 * - Note text (required)
 * - Evidence hash reference (optional)
 * - Immutable read-only view after submission
 *
 * Authority: walkthrough Phase Q §5, FEATURE_FRONTEND §9.8
 * CDM-15: escalation ticket form must transition to immutable view immediately after submit
 */

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingButton } from "@/components/ui/LoadingButton"
import { Separator } from "@/components/ui/separator"
import {
  ESCALATION_CATEGORIES,
  createEscalationTicket,
  getEscalationTicket,
  type EscalationCategory,
  type EscalationTicket,
} from "./api"
import { formatDateTime } from "@/lib/format/intl"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Immutable Ticket View (post-submit) ───────────────────────────────────────

interface ImmutableTicketViewProps {
  ticket: EscalationTicket
}

function ImmutableTicketView({ ticket }: ImmutableTicketViewProps) {
  const categoryLabel =
    ESCALATION_CATEGORIES.find((c) => c.value === ticket.category)?.label ??
    ticket.category

  return (
    <Card className="border-dvote-saffron/30 bg-muted/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-dvote-saffron-dark font-bold">⚠</span>
          Escalation Ticket — Submitted
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Immutable notice */}
        <div className="rounded-lg border border-dvote-saffron/30 bg-dvote-saffron-subtle/20 p-3">
          <p className="text-sm text-foreground">
            <strong>This ticket is immutable.</strong> Corrections may be added as follow-up
            notes only. Contact ECI for urgent matters.
          </p>
        </div>

        {/* Ticket details */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ticket ID</span>
            <span className="font-mono text-xs">{ticket.ticketId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">{categoryLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDateTime(ticket.createdAt)}</span>
          </div>
          {ticket.evidenceHash && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Evidence Hash</span>
              <span className="font-mono text-xs">{ticket.evidenceHash}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Note */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Note</p>
          <p className="text-sm whitespace-pre-wrap">{ticket.note}</p>
        </div>

        {/* Submitter */}
        <p className="text-xs text-muted-foreground">
          Submitted by {ticket.createdBy}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Escalation Ticket Form ────────────────────────────────────────────────────

interface EscalationTicketFormProps {
  electionId: string
  onSuccess?: (ticket: EscalationTicket) => void
}

export function EscalationTicketForm({ electionId, onSuccess }: EscalationTicketFormProps) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<EscalationCategory | "">("")
  const [note, setNote] = useState("")
  const [evidenceHash, setEvidenceHash] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState<EscalationTicket | null>(null)

  // Fetch existing ticket on mount
  const { data: existingTicket } = useQuery({
    queryKey: ["escalation-ticket", electionId],
    queryFn: () => getEscalationTicket(electionId),
    enabled: Boolean(electionId),
  })

  // Pre-populate submitted state if ticket already exists
  if (existingTicket?.ticket && !isSubmitted && !submittedTicket) {
    setIsSubmitted(true)
    setSubmittedTicket(existingTicket.ticket)
  }

  const createMutation = useMutation({
    mutationFn: createEscalationTicket,
    onSuccess: ({ ticket }) => {
      setIsSubmitted(true)
      setSubmittedTicket(ticket)
      queryClient.invalidateQueries({ queryKey: ["escalation-ticket", electionId] })
      toast.success("Escalation ticket submitted successfully.")
      onSuccess?.(ticket)
    },
    onError: () => {
      toast.error("Failed to submit escalation ticket. Please try again.")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !note.trim()) return
    createMutation.mutate({
      electionId,
      category: category as EscalationCategory,
      note: note.trim(),
      evidenceHash: evidenceHash.trim() || undefined,
    })
  }

  const isValid = category && note.trim().length > 0

  // ── Immutable view after submit ──────────────────────────────────────────

  if (isSubmitted && submittedTicket) {
    return <ImmutableTicketView ticket={submittedTicket} />
  }

  // ── Create form ──────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create Escalation Ticket</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Report an issue requiring ECI intervention. This ticket will be reviewed by the
          Election Commission.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="escalation-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as EscalationCategory)}
            >
              <SelectTrigger id="escalation-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {ESCALATION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="escalation-note">
              Note <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="escalation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              maxLength={1000}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground text-right">{note.length}/1000</p>
          </div>

          {/* Evidence hash */}
          <div className="space-y-2">
            <Label htmlFor="escalation-evidence">
              Evidence Hash{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <input
              id="escalation-evidence"
              type="text"
              value={evidenceHash}
              onChange={(e) => setEvidenceHash(e.target.value)}
              placeholder="0x..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Reference hash for supporting evidence (transaction hash, file hash, etc.)
            </p>
          </div>

          <Separator />

          {/* Submit */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Ticket becomes immutable after submission
            </p>
            <LoadingButton
              type="submit"
              isLoading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
              className={cn(
                "bg-dvote-saffron hover:bg-dvote-saffron/90 text-white",
                (!isValid || createMutation.isPending) && "opacity-50 cursor-not-allowed",
              )}
            >
              Submit Escalation Ticket
            </LoadingButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
