/**
 * DVote Frontend — ProfilePhotoUpload Component
 *
 * Self-contained profile photo management widget that handles:
 *   - Photo preview (local blob URL before upload; objectKey URL after)
 *   - Add photo (idle state → file picker → authorize → PUT → finalize)
 *   - Replace photo (scan-pending state → file picker → new authorize flow)
 *   - Remove photo (pre-submit or policy-allowed post-submit states)
 *
 * Upload lifecycle uses the existing useUploadContract hook (Phase L):
 *   authorize (PROFILE_PHOTO, ≤5 MB) → PUT to R2 → SHA-256 → finalize-bind
 *
 * State badges mirror FEATURE_FRONTEND §8.5 file-state UX:
 *   idle, uploading, scan-pending, error, expired
 *
 * MIME/size policy:
 *   - Accepted: image/jpeg, image/png, image/webp (image/*)
 *   - Max: 5 MB (PROFILE_PHOTO_MAX_BYTES)
 *   - PDFs are NOT accepted for profile photo (image only)
 *
 * L-C2 note: profile photo is shown ONLY in authorized contexts —
 *   this component renders the blob preview locally; no signed URL
 *   generation in Phase M (pending CMS endpoint in later phase).
 *
 * Authority: walkthrough Phase M, FEATURE_FRONTEND §8.5, Plan Phase 13,
 *            useUploadContract hook, contracts.ts
 */

import { useRef, useState, useEffect, useCallback } from "react"
import {
  User,
  Camera,
  Trash2,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUploadContract } from "@/hooks/useUploadContract"
import { formatCountdown } from "@/lib/upload/contracts"
import { cn } from "@/lib/utils"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProfilePhotoUploadProps {
  /**
   * Required for POST /uploads/authorize:
   * Only defined when a KYC submission exists (submissionId from GET /kyc/me)
   */
  submissionId: string | null
  electionId: string | null
  constituencyId: string | null
  /** Called with artifactId after finalize-bind succeeds */
  onUploadSuccess?: (artifactId: string, objectKey: string) => void
  /** Called when user removes the photo */
  onRemove?: () => void
  /** Disable the widget (e.g., KYC already submitted and immutable) */
  disabled?: boolean
}

// ─── MIME filter for profile photo (image only — no PDFs) ────────────────────

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif"

// ─── ProfilePhotoUpload component ─────────────────────────────────────────────

/**
 * Profile photo upload widget: preview, add, replace, remove.
 */
export function ProfilePhotoUpload({
  submissionId,
  electionId,
  constituencyId,
  onUploadSuccess,
  onRemove,
  disabled = false,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Local blob preview URL — created when user selects a file
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Whether a finalized photo is present (scan-pending state)
  const [isFinalized, setIsFinalized] = useState(false)

  // useUploadContract hook — PROFILE_PHOTO artifact type
  const photoUpload = useUploadContract({
    artifactType: "PROFILE_PHOTO",
    submissionId: submissionId ?? "",
    electionId: electionId ?? "",
    constituencyId: constituencyId ?? "",
    onFinalizeSuccess: (artifactId, objectKey) => {
      setIsFinalized(true)
      onUploadSuccess?.(artifactId, objectKey)
    },
  })

  // Generate and revoke blob preview URL on file selection
  useEffect(() => {
    const file = photoUpload.selectedFile
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photoUpload.selectedFile])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Validate image MIME client-side before useUploadContract
      if (!file.type.startsWith("image/")) {
        return  // useUploadContract will reject and show error too
      }
      photoUpload.startUpload(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [photoUpload]
  )

  const handleRemove = useCallback(() => {
    photoUpload.resetUpload()
    setPreviewUrl(null)
    setIsFinalized(false)
    onRemove?.()
  }, [photoUpload, onRemove])

  const handleReplace = useCallback(() => {
    photoUpload.resetUpload()
    setPreviewUrl(null)
    setIsFinalized(false)
    inputRef.current?.click()
  }, [photoUpload])

  const triggerPicker = useCallback(() => {
    if (!submissionId) return
    inputRef.current?.click()
  }, [submissionId])

  const { status, progress, secondsRemaining, errorMessage } = photoUpload
  const isInProgress =
    status === "authorizing" ||
    status === "authorized" ||
    status === "uploading" ||
    status === "uploaded" ||
    status === "finalizing"
  const isExpired = status === "expired"
  const isError = status === "error"
  const isIdle = status === "idle"

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        id="profile-photo-input"
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        aria-label="Choose profile photo"
        onChange={handleFileChange}
        disabled={disabled || isInProgress || !submissionId}
      />

      {/* Avatar circle */}
      <div
        className={cn(
          "relative w-28 h-28 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 transition-all",
          isFinalized && "border-green-400",
          isInProgress && "border-primary",
          isExpired && "border-amber-400",
          isError && "border-destructive/50",
          isIdle && !previewUrl && "border-dashed border-border bg-muted/40",
          previewUrl && "border-primary/50",
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile photo preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <User
            className={cn(
              "size-12",
              isFinalized ? "text-green-500" : "text-muted-foreground/40"
            )}
            aria-hidden="true"
          />
        )}

        {/* In-progress overlay */}
        {isInProgress && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
            <Loader2 className="size-7 text-white animate-spin" aria-hidden="true" />
            {(status === "authorized" || status === "uploading") && (
              <span className="text-white text-xs font-semibold">{progress}%</span>
            )}
          </div>
        )}

        {/* Finalized overlay badge */}
        {isFinalized && !isInProgress && (
          <div className="absolute bottom-1 right-1 rounded-full bg-green-500 p-0.5">
            <CheckCircle2 className="size-3.5 text-white" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* TTL countdown */}
      {(status === "authorized" || status === "uploading") && secondsRemaining > 0 && (
        <div className="flex items-center gap-1 text-xs text-primary font-mono">
          <Clock className="size-3" aria-hidden="true" />
          <span>{formatCountdown(secondsRemaining)}</span>
          <span className="text-muted-foreground font-sans">left</span>
        </div>
      )}

      {/* Status text */}
      {isInProgress && (
        <p className="text-xs text-muted-foreground text-center">
          {status === "authorizing" && "Getting upload slot…"}
          {status === "authorized" && "Ready to upload…"}
          {status === "uploading" && `Uploading… ${progress}%`}
          {status === "uploaded" && "Verifying…"}
          {status === "finalizing" && "Binding photo…"}
        </p>
      )}

      {isFinalized && (
        <p className="text-xs text-green-700 text-center font-medium">
          Photo uploaded · scan pending
        </p>
      )}

      {isExpired && (
        <p className="text-xs text-amber-700 text-center">
          Contract expired — please re-upload
        </p>
      )}

      {isError && errorMessage && (
        <div className="flex items-start gap-1 max-w-xs">
          <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* No submissionId warning */}
      {!submissionId && (
        <p className="text-xs text-muted-foreground text-center">
          Start your KYC first to enable photo upload
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(isIdle || isExpired || isError) && !isFinalized && (
          <Button
            id="profile-photo-add"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={isExpired || isError ? handleReplace : triggerPicker}
            disabled={disabled || !submissionId}
            title={!submissionId ? "Start your KYC submission first" : undefined}
          >
            <Camera className="size-3.5" aria-hidden="true" />
            {isExpired || isError ? "Re-upload Photo" : "Add Photo"}
          </Button>
        )}

        {isFinalized && (
          <>
            <Button
              id="profile-photo-replace"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleReplace}
              disabled={disabled}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Replace
            </Button>
            <Button
              id="profile-photo-remove"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={handleRemove}
              disabled={disabled}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
