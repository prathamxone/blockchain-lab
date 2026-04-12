/**
 * DVote Frontend — useUploadContract Hook
 *
 * Manages the full lifecycle of a single upload artifact:
 *   idle → authorizing → authorized → uploading → uploaded → finalizing → scan-pending
 *
 * TTL Tracking (CDM-11):
 *   - Starts a 1-second interval countdown once a contract is acquired.
 *   - When TTL expires (isContractExpired returns true), transitions to
 *     status="expired" and clears the contract. Draft is preserved.
 *   - The upload UI must call reAuthorize() to restart the flow.
 *
 * The hook does NOT write to kyc-wizard-store directly.
 * The parent component (KycStepUpload) calls onFinalizeSuccess to update
 * the store's additionalEvidenceRefs[] (CDM-11 gate).
 *
 * Usage:
 *   const upload = useUploadContract({ artifactType, submissionId, electionId,
 *                                      constituencyId, onFinalizeSuccess })
 *   upload.startUpload(file)   → authorize + PUT + finalize
 *   upload.reAuthorize()       → clears expired contract, shows file picker again
 *   upload.status              → "idle" | "authorizing" | ... | "scan-pending" | "expired" | "error"
 *   upload.progress            → 0–100 (PUT progress)
 *   upload.secondsRemaining    → TTL countdown
 *   upload.errorMessage        → last error description
 *   upload.artifactId          → set after successful finalize-bind
 *
 * Authority: walkthrough Phase L, CDM-11, contracts.ts, validators.ts
 */

import { useState, useEffect, useRef, useCallback } from "react"

import {
  requestUploadContract,
  putFileToStorage,
  finalizeUploadContract,
  computeSha256Hex,
  isContractExpired,
  contractSecondsRemaining,
  type UploadContract,
  type ArtifactUploadStatus,
} from "@/lib/upload/contracts"
import { validateFile } from "@/lib/upload/validators"
import { normalizeFileExt } from "@/lib/upload/validators"
import type { ArtifactType } from "@/lib/upload/validators"
import { ApiError } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseUploadContractOptions {
  /** Artifact type for size + MIME validation */
  artifactType: ArtifactType
  /** Required for POST /uploads/authorize */
  submissionId: string
  electionId: string
  constituencyId: string
  /**
   * Called after finalize-bind succeeds.
   * Parent uses this to add artifactId to evidenceRefs in kyc-wizard-store.
   */
  onFinalizeSuccess: (artifactId: string, objectKey: string) => void
  /** Called when an error occurs during any phase */
  onError?: (errorMessage: string) => void
}

export interface UseUploadContractReturn {
  /** Current lifecycle status */
  status: ArtifactUploadStatus
  /** PUT upload progress 0–100 */
  progress: number
  /** Seconds remaining on the current contract (0 if no contract or expired) */
  secondsRemaining: number
  /** Last error message (cleared on retry) */
  errorMessage: string | null
  /** artifactId from successful finalize-bind */
  artifactId: string | null
  /** The file currently being uploaded (set after file selection) */
  selectedFile: File | null
  /**
   * Starts the full authorize → PUT → finalize flow for a given File.
   * Call this from the file input onChange handler.
   */
  startUpload: (file: File) => Promise<void>
  /**
   * Clears the expired or errored contract and resets to idle.
   * Preserves draft context in parent store.
   */
  resetUpload: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the full upload lifecycle for a single artifact slot.
 */
export function useUploadContract(
  options: UseUploadContractOptions
): UseUploadContractReturn {
  const {
    artifactType,
    submissionId,
    electionId,
    constituencyId,
    onFinalizeSuccess,
    onError,
  } = options

  const [status, setStatus] = useState<ArtifactUploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Ref to hold current contract for TTL countdown
  const contractRef = useRef<UploadContract | null>(null)
  const ttlIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── TTL interval management ─────────────────────────────────────────────────

  const startTtlCountdown = useCallback((contract: UploadContract) => {
    contractRef.current = contract
    setSecondsRemaining(contractSecondsRemaining(contract.expiresAt))

    ttlIntervalRef.current = setInterval(() => {
      const secs = contractSecondsRemaining(contract.expiresAt)
      setSecondsRemaining(secs)

      if (isContractExpired(contract.expiresAt)) {
        // CDM-11: contract expired — force re-authorize
        contractRef.current = null
        clearInterval(ttlIntervalRef.current!)
        ttlIntervalRef.current = null
        setStatus("expired")
        const msg = "Upload contract expired. Please re-upload the file to get a new contract."
        setErrorMessage(msg)
        onError?.(msg)
      }
    }, 1000)
  }, [onError])

  const clearTtlCountdown = useCallback(() => {
    if (ttlIntervalRef.current) {
      clearInterval(ttlIntervalRef.current)
      ttlIntervalRef.current = null
    }
    contractRef.current = null
    setSecondsRemaining(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTtlCountdown()
  }, [clearTtlCountdown])

  // ── startUpload flow ────────────────────────────────────────────────────────

  const startUpload = useCallback(async (file: File) => {
    // 1. Client-side file validation
    const validation = validateFile(file, artifactType)
    if (!validation.ok) {
      setErrorMessage(validation.error.message)
      setStatus("error")
      onError?.(validation.error.message)
      return
    }

    setSelectedFile(file)
    setErrorMessage(null)
    setArtifactId(null)
    setProgress(0)
    clearTtlCountdown()

    try {
      // 2. Authorize
      setStatus("authorizing")
      const contract = await requestUploadContract({
        submissionId,
        electionId,
        constituencyId,
        artifactType,
        mimeType: file.type,
        fileExt: normalizeFileExt(file.name),
        fileSizeBytes: file.size,
      })

      // 3. Start TTL countdown
      startTtlCountdown(contract)
      setStatus("authorized")

      // 4. Check contract not already expired before PUT
      if (isContractExpired(contract.expiresAt, 0)) {
        throw new Error("Contract expired immediately after issuing — clock skew?")
      }

      // 5. PUT to R2
      setStatus("uploading")
      await putFileToStorage(file, contract, (pct) => setProgress(pct))
      setStatus("uploaded")

      // 6. Compute checksum
      const checksumSha256Hex = await computeSha256Hex(file)

      // 7. Check if TTL expired during PUT (very long upload)
      if (isContractExpired(contract.expiresAt)) {
        clearTtlCountdown()
        setStatus("expired")
        const msg = "Contract expired during upload. Please re-upload to get a fresh contract."
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      // 8. Finalize-bind (CDM-11 gate)
      setStatus("finalizing")
      const result = await finalizeUploadContract({
        contractId: contract.contractId,
        objectKey: contract.objectKey,
        checksumSha256Hex,
      })

      // 9. Stop TTL countdown — no longer needed
      clearTtlCountdown()

      // 10. Notify parent with artifactId (CDM-11: now truly finalize-bound)
      setArtifactId(result.artifactId)
      setStatus("scan-pending")
      onFinalizeSuccess(result.artifactId, result.objectKey)

    } catch (err) {
      clearTtlCountdown()

      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred during upload."

      // Distinguish TTL expiry from other errors
      const isExpired =
        err instanceof ApiError &&
        (err.message.includes("expired") || err.message.includes("missing"))

      setStatus(isExpired ? "expired" : "error")
      setErrorMessage(message)
      onError?.(message)
    }
  }, [
    artifactType,
    submissionId,
    electionId,
    constituencyId,
    onFinalizeSuccess,
    onError,
    startTtlCountdown,
    clearTtlCountdown,
  ])

  // ── resetUpload ─────────────────────────────────────────────────────────────

  const resetUpload = useCallback(() => {
    clearTtlCountdown()
    setStatus("idle")
    setProgress(0)
    setErrorMessage(null)
    setArtifactId(null)
    setSelectedFile(null)
  }, [clearTtlCountdown])

  return {
    status,
    progress,
    secondsRemaining,
    errorMessage,
    artifactId,
    selectedFile,
    startUpload,
    resetUpload,
  }
}
