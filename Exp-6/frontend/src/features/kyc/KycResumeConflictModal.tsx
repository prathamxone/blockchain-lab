/**
 * DVote Frontend — KycResumeConflictModal (CDM-10)
 *
 * Shown when GET /kyc/me detects an existing server-side draft for this election.
 * CDM-10 requirements:
 *   1. Default action: USE SERVER DRAFT (primary/prominent button)
 *   2. Secondary action: Use Local Data (requires explicit choice + warning)
 *   3. Never silently auto-merge or overwrite.
 *
 * The modal is non-dismissable (no X button, no backdrop click dismiss)
 * to force an explicit decision before the wizard continues.
 *
 * Authority: walkthrough Phase K, CDM-10
 */

import { AlertTriangle, Server, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { kycStatusLabel, type KycStatus } from "@/lib/format/mask"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycResumeConflictModalProps {
  /** Whether the conflict modal is currently open */
  open: boolean
  /** KYC state of the server draft (e.g. "DRAFT", "NEEDS_RESUBMISSION") */
  serverState: KycStatus
  /** ISO-8601 submittedAt of server draft (null if still draft) */
  serverSubmittedAt: string | null
  /** Called when user chooses to use the server draft (CDM-10 default) */
  onUseServer: () => void
  /** Called when user explicitly chooses to use their local (unsaved) form data */
  onUseLocal: () => void
}

// ─── KycResumeConflictModal ───────────────────────────────────────────────────

/**
 * Non-dismissable draft conflict resolution modal (CDM-10).
 * Forces user to make an explicit choice between server and local data.
 */
export function KycResumeConflictModal({
  open,
  serverState,
  serverSubmittedAt,
  onUseServer,
  onUseLocal,
}: KycResumeConflictModalProps) {
  const serverStateLabel = kycStatusLabel(serverState)

  const serverTimestamp = serverSubmittedAt
    ? new Date(serverSubmittedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null

  return (
    <Dialog
      open={open}
      // CDM-10: non-dismissable — user MUST make an explicit choice
      // disablePointerDismissal blocks backdrop click
      // onOpenChange: return nothing to block close from Escape key
      disablePointerDismissal
      onOpenChange={() => {
        /* intentionally blocked — user must choose server or local */
      }}
    >
      <DialogContent
        className="max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle
              className="size-5 text-amber-600 shrink-0"
              aria-hidden="true"
            />
            <DialogTitle className="text-base font-semibold">
              Existing KYC Draft Found
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            A KYC submission already exists on the server for this election with
            status{" "}
            <span className="font-semibold text-foreground">
              {serverStateLabel}
            </span>
            {serverTimestamp && (
              <>
                {" "}
                (saved{" "}
                <span className="font-medium text-foreground">
                  {serverTimestamp}
                </span>
                )
              </>
            )}
            . Choose which data to continue with.
          </DialogDescription>
        </DialogHeader>

        {/* Warning notice */}
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          <strong>Important:</strong> If you choose your local (unsaved) data,
          the server draft will be{" "}
          <span className="font-semibold">overwritten and cannot be recovered</span>.
          The server draft is the recommended choice.
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-1">
          {/* Primary: use server draft (CDM-10 default) */}
          <Button
            id="kyc-conflict-use-server"
            onClick={onUseServer}
            className="w-full justify-start gap-2"
            variant="default"
          >
            <Server className="size-4" aria-hidden="true" />
            Use Server Draft
            <span className="ml-auto text-xs opacity-75">(Recommended)</span>
          </Button>

          {/* Secondary: use local data (explicit overwrite) */}
          <Button
            id="kyc-conflict-use-local"
            onClick={onUseLocal}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <HardDrive className="size-4" aria-hidden="true" />
            Use My Local Data
            <span className="ml-auto text-xs text-destructive opacity-80">
              (Overwrites server)
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
