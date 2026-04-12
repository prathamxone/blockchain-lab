/**
 * DVote Frontend — Upload Contract Helpers
 *
 * Encapsulates the two-phase upload lifecycle:
 *   Phase 1 (authorize): POST /uploads/authorize → presigned PUT URL + contractId
 *   Phase 2 (PUT):       Direct PUT to R2 using returneduploadUrl
 *   Phase 3 (finalize):  POST /uploads/finalize with contractId + checksum → artifactId
 *
 * CDM-11 enforcement:
 *   authorize() success is NOT equivalent to finalize-bind success.
 *   The caller must track finalize-bind status separately.
 *   KYC submit remains disabled until all required artifacts are finalize-bound.
 *
 * TTL awareness:
 *   The backend sets a 10-minute TTL (600 s) on each contract.
 *   Callers should pass expiresAt to useUploadContract for live countdown UI.
 *   On TTL expiry, the contract is deleted from Redis. Finalize calls with an
 *   expired contract receive a 409 Conflict ("Upload contract has expired").
 *   The client must then re-authorize from scratch.
 *
 * Checksum:
 *   SHA-256 is computed from the ArrayBuffer of the file using Web Crypto API
 *   and encoded as lowercase hex (64 chars). This matches the backend regex.
 *
 * Authority: walkthrough Phase L, CDM-11, backend uploads/routes.ts
 *            backend upload-authorize.service.ts, upload-finalize.service.ts
 */

import { apiClient } from "@/lib/api-client"
import type { ArtifactType } from "@/lib/upload/validators"

// ─── Types ────────────────────────────────────────────────────────────────────

/** Payload sent to POST /uploads/authorize */
export interface AuthorizeRequestPayload {
  submissionId: string
  electionId: string
  constituencyId: string
  artifactType: ArtifactType
  mimeType: string
  fileExt: string
  fileSizeBytes: number
}

/** Response shape from POST /uploads/authorize (within ApiSuccessEnvelope.data) */
export interface AuthorizeResponse {
  contractId: string
  objectKey: string
  uploadUrl: string
  expiresAt: string      // ISO 8601 timestamp
  uploadMethod: "PUT"
  requiredHeaders: {
    "Content-Type": string
  }
}

/** Represents a granted upload contract in the frontend state */
export interface UploadContract {
  contractId: string
  objectKey: string
  uploadUrl: string
  expiresAt: string
  mimeType: string
  artifactType: ArtifactType
  requiredHeaders: {
    "Content-Type": string
  }
}

/** Payload sent to POST /uploads/finalize */
export interface FinalizeRequestPayload {
  contractId: string
  objectKey: string
  checksumSha256Hex: string
}

/** Response shape from POST /uploads/finalize (within ApiSuccessEnvelope.data) */
export interface FinalizeResponse {
  artifactId: string
  objectKey: string
  scanState: "PENDING"
  scanQueuedAt: string
  finalizedAt: string
}

/** All status states a single artifact can have */
export type ArtifactUploadStatus =
  | "idle"             // Not started
  | "authorizing"      // POST /uploads/authorize in progress
  | "authorized"       // Have a contract, ready for PUT
  | "uploading"        // PUT to R2 in progress
  | "uploaded"         // PUT completed, awaiting finalize
  | "finalizing"       // POST /uploads/finalize in progress
  | "scan-pending"     // Finalized; backend scan queued
  | "expired"          // Contract TTL expired before finalize
  | "error"            // Any terminal error

// ─── Checksum (SHA-256) ───────────────────────────────────────────────────────

/**
 * Computes SHA-256 of a File and returns it as lowercase hex string (64 chars).
 * Uses Web Crypto API (available in all modern browsers).
 *
 * Required by POST /uploads/finalize as checksumSha256Hex.
 *
 * @throws if the browser does not support SubtleCrypto (extremely rare)
 */
export async function computeSha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

/**
 * Calls POST /uploads/authorize.
 * Returns the full UploadContract including expiresAt for TTL tracking.
 *
 * Throws ApiError on backend rejection (e.g., file too large, bad MIME).
 */
export async function requestUploadContract(
  payload: AuthorizeRequestPayload
): Promise<UploadContract> {
  const response = await apiClient.post<AuthorizeResponse>(
    "/uploads/authorize",
    payload
  )

  return {
    contractId: response.contractId,
    objectKey: response.objectKey,
    uploadUrl: response.uploadUrl,
    expiresAt: response.expiresAt,
    mimeType: payload.mimeType,
    artifactType: payload.artifactType,
    requiredHeaders: response.requiredHeaders,
  }
}

/**
 * Performs the direct PUT to R2 using the presigned uploadUrl from the contract.
 *
 * Important:
 *   - Must set Content-Type header from contract.requiredHeaders["Content-Type"].
 *   - Do NOT use apiClient here — the PUT goes directly to R2, not the backend API.
 *   - The request has no Authorization header (R2 presigned URL is self-authenticating).
 *
 * @throws if the PUT fails (network error or R2 rejection)
 */
export async function putFileToStorage(
  file: File,
  contract: UploadContract,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", contract.uploadUrl, true)
    xhr.setRequestHeader(
      "Content-Type",
      contract.requiredHeaders["Content-Type"]
    )

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`R2 PUT failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error("Network error during file upload"))
    xhr.onabort = () => reject(new Error("Upload aborted"))
    xhr.send(file)
  })
}

/**
 * Calls POST /uploads/finalize with the given contract ID, object key,
 * and SHA-256 hex checksum of the uploaded file.
 *
 * Returns FinalizeResponse with artifactId and scan state.
 *
 * CDM-11: This is the ONLY step that marks the artifact as finalize-bound.
 * KYC submit must not proceed until this returns successfully.
 *
 * @throws ApiError if contract expired (409), size mismatch (409),
 *         or scan service unavailable (503)
 */
export async function finalizeUploadContract(
  payload: FinalizeRequestPayload
): Promise<FinalizeResponse> {
  return apiClient.post<FinalizeResponse>("/uploads/finalize", payload)
}

/**
 * Checks if an upload contract has expired based on its expiresAt ISO timestamp.
 * Uses a 15-second early-expire buffer to avoid edge race conditions.
 */
export function isContractExpired(expiresAt: string, bufferMs = 15_000): boolean {
  const expiryMs = new Date(expiresAt).getTime()
  return Date.now() >= expiryMs - bufferMs
}

/**
 * Returns the number of seconds remaining on a contract.
 * Returns 0 if already expired.
 */
export function contractSecondsRemaining(expiresAt: string): number {
  const remaining = Math.floor(
    (new Date(expiresAt).getTime() - Date.now()) / 1000
  )
  return Math.max(0, remaining)
}

/**
 * Formats a contract countdown as mm:ss string.
 * Example: 558 → "09:18"
 */
export function formatCountdown(secondsRemaining: number): string {
  const m = Math.floor(secondsRemaining / 60)
  const s = secondsRemaining % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
