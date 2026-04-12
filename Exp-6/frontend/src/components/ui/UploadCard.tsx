/**
 * DVote Frontend — UploadCard Component
 *
 * Renders the status of a single upload artifact with deterministic
 * state badges and actions per the walkthrough Phase L specification.
 *
 * States rendered:
 *   "idle"         → Drop zone / file picker CTA
 *   "authorizing"  → Spinner "Getting upload slot…"
 *   "authorized"   → TTL countdown badge, "Starting upload…"
 *   "uploading"    → Progress bar + percentage + TTL countdown
 *   "uploaded"     → "Verifying checksum…"
 *   "finalizing"   → "Binding artifact…"
 *   "scan-pending" → Green success badge "Upload complete — scan pending"
 *   "expired"      → Amber warning with Re-upload CTA
 *   "error"        → Red error with error message + Retry CTA
 *
 * CDM-11 awareness:
 *   "scan-pending" = finalize-bound = contributes to submit gate
 *   All other states = NOT finalize-bound = submit remains disabled
 *
 * Authority: walkthrough Phase L, CDM-11, Plan Phase 12
 */

import { useRef } from "react"
import {
  Upload,
  FileCheck2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatCountdown, type ArtifactUploadStatus } from "@/lib/upload/contracts"
import { ALLOWED_MIME_DESCRIPTION, getMaxSizeLabel, type ArtifactType } from "@/lib/upload/validators"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UploadCardProps {
  /** Unique HTML id prefix for this card's elements */
  id: string
  /** Label shown above the card (e.g., "Additional Evidence", "Profile Photo") */
  label: string
  /** Whether this artifact is required for KYC submission */
  required?: boolean
  /** Artifact type for sizing/MIME policy labels */
  artifactType: ArtifactType
  /** Current upload lifecycle status */
  status: ArtifactUploadStatus
  /** PUT progress percentage 0–100 */
  progress: number
  /** Seconds remaining on the active contract */
  secondsRemaining: number
  /** Error message from last failed operation */
  errorMessage: string | null
  /** Name of the selected file (for display) */
  fileName?: string
  /**
   * Called with the selected File object when the user picks a file.
   * Parent hook (useUploadContract) handles validation + upload initiation.
   */
  onFileSelect: (file: File) => void
  /** Called when the user clicks Remove/Reset — clears the upload slot */
  onReset: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  secondsRemaining,
}: {
  status: ArtifactUploadStatus
  secondsRemaining: number
}) {
  switch (status) {
    case "scan-pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
          <FileCheck2 className="size-3" aria-hidden="true" /> Upload bound
        </span>
      )
    case "expired":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <Clock className="size-3" aria-hidden="true" /> Contract expired
        </span>
      )
    case "error":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
          <AlertCircle className="size-3" aria-hidden="true" /> Upload failed
        </span>
      )
    case "authorizing":
    case "authorized":
    case "uploading":
    case "uploaded":
    case "finalizing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" /> In progress
          {(status === "authorized" || status === "uploading") && secondsRemaining > 0 && (
            <span className="ml-1 font-mono">{formatCountdown(secondsRemaining)}</span>
          )}
        </span>
      )
    default:
      return null
  }
}

// ─── UploadCard component ─────────────────────────────────────────────────────

/**
 * Single artifact upload slot component.
 */
export function UploadCard(props: UploadCardProps) {
  const {
    id,
    label,
    required = false,
    artifactType,
    status,
    progress,
    secondsRemaining,
    errorMessage,
    fileName,
    onFileSelect,
    onReset,
  } = props

  const inputRef = useRef<HTMLInputElement>(null)

  const isInProgress =
    status === "authorizing" ||
    status === "authorized" ||
    status === "uploading" ||
    status === "uploaded" ||
    status === "finalizing"

  const isIdle = status === "idle"
  const isExpired = status === "expired"
  const isError = status === "error"
  const isSuccess = status === "scan-pending"

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    // Reset input value so the same file can be re-selected after reset
    if (inputRef.current) inputRef.current.value = ""
  }

  const triggerFilePicker = () => inputRef.current?.click()

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 transition-all",
        isSuccess && "border-green-300 bg-green-50",
        isExpired && "border-amber-300 bg-amber-50",
        isError && "border-destructive/40 bg-destructive/5",
        isInProgress && "border-primary/30 bg-primary/5",
        isIdle && "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 cursor-pointer",
      )}
      onClick={isIdle ? triggerFilePicker : undefined}
      role={isIdle ? "button" : undefined}
      tabIndex={isIdle ? 0 : undefined}
      onKeyDown={
        isIdle
          ? (e) => { if (e.key === "Enter" || e.key === " ") triggerFilePicker() }
          : undefined
      }
      aria-label={isIdle ? `Upload ${label}` : undefined}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-label={`Choose file for ${label}`}
        onChange={handleInputChange}
        disabled={isInProgress || isSuccess}
      />

      {/* Header row: label + status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {label}
          </span>
          {required && (
            <span className="text-destructive text-sm" aria-label="required">*</span>
          )}
        </div>
        <StatusBadge status={status} secondsRemaining={secondsRemaining} />
      </div>

      {/* ── Idle state: drop zone ─────────────────────────────────────────── */}
      {isIdle && (
        <div className="flex flex-col items-center gap-2 py-4 text-center pointer-events-none">
          <Upload className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click or drag to upload
            <br />
            <span className="text-xs text-muted-foreground/70">
              {ALLOWED_MIME_DESCRIPTION} · max {getMaxSizeLabel(artifactType)}
            </span>
          </p>
        </div>
      )}

      {/* ── Authorizing ───────────────────────────────────────────────────── */}
      {status === "authorizing" && (
        <div className="flex items-center gap-2 text-sm text-primary py-2">
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
          <span>Getting upload authorization…</span>
        </div>
      )}

      {/* ── Authorized / Uploading ────────────────────────────────────────── */}
      {(status === "authorized" || status === "uploading") && (
        <div className="space-y-2">
          {fileName && (
            <p className="text-xs text-foreground font-medium truncate">{fileName}</p>
          )}
          {/* Progress bar */}
          <div
            className="h-2 rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress: ${progress}%`}
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress}% uploaded</span>
            {secondsRemaining > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="size-3" aria-hidden="true" />
                {formatCountdown(secondsRemaining)} left
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Checksum / Finalizing ─────────────────────────────────────────── */}
      {(status === "uploaded" || status === "finalizing") && (
        <div className="flex items-center gap-2 text-sm text-primary py-1">
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
          <span>
            {status === "uploaded" ? "Computing checksum…" : "Binding artifact…"}
          </span>
        </div>
      )}

      {/* ── Scan pending (success) ────────────────────────────────────────── */}
      {isSuccess && (
        <div className="flex items-start gap-2 py-1">
          <FileCheck2 className="size-5 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            {fileName && (
              <p className="text-xs font-medium text-green-800 truncate">{fileName}</p>
            )}
            <p className="text-xs text-green-700 mt-0.5">
              Upload verified and bound. Scan queued.
            </p>
          </div>
          <Button
            id={`${id}-remove`}
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onReset() }}
            aria-label={`Remove uploaded file for ${label}`}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* ── Expired ──────────────────────────────────────────────────────── */}
      {isExpired && (
        <div className="flex items-start gap-2 py-1">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-800 font-medium">Upload contract expired</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              The 10-minute upload window expired. Your draft is safe — please upload again.
            </p>
          </div>
          <Button
            id={`${id}-reauthorize`}
            variant="outline"
            size="sm"
            className="shrink-0 gap-1 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={(e) => { e.stopPropagation(); onReset(); triggerFilePicker() }}
            aria-label={`Re-upload ${label} with a new contract`}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Re-upload
          </Button>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-start gap-2 py-1">
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-destructive font-medium">Upload failed</p>
            {errorMessage && (
              <p className="text-xs text-destructive/80 mt-0.5 break-words">{errorMessage}</p>
            )}
          </div>
          <Button
            id={`${id}-retry`}
            variant="outline"
            size="sm"
            className="shrink-0 gap-1 text-xs"
            onClick={(e) => { e.stopPropagation(); onReset(); triggerFilePicker() }}
            aria-label={`Retry upload for ${label}`}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
