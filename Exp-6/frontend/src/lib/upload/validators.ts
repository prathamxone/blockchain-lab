/**
 * DVote Frontend — Upload Validators
 *
 * Client-side MIME type and file size validation before calling
 * POST /uploads/authorize. Mirrors backend assertMimeAllowed and
 * assertUploadSize rules so rejections happen instantly without
 * a round-trip.
 *
 * Size limits (match backend env defaults):
 *   DOCUMENT    ≤ 10 MB  (10 * 1024 * 1024 bytes)
 *   PROFILE_PHOTO ≤  5 MB  ( 5 * 1024 * 1024 bytes)
 *
 * Allowed MIME types (match backend assertMimeAllowed):
 *   image/*          (JPEG, PNG, WEBP, GIF, BMP…)
 *   application/pdf
 *
 * Authority: walkthrough Phase L, backend upload-authorize.service.ts,
 *            FEATURE_FRONTEND §6.5 upload policy
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Matches backend UploadArtifactType Prisma enum */
export type ArtifactType = "DOCUMENT" | "PROFILE_PHOTO"

/** Validation error structure returned by validators */
export interface UploadValidationError {
  code:
    | "MIME_NOT_ALLOWED"
    | "FILE_TOO_LARGE"
    | "FILE_EMPTY"
    | "MULTIPLE_FILES"
  message: string
}

/** Result of a file validation check */
export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: UploadValidationError }

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum allowed size for DOCUMENT artifacts (must match backend) */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Maximum allowed size for PROFILE_PHOTO artifacts (must match backend) */
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/** Allowed MIME type prefixes (mirrors backend assertMimeAllowed) */
const ALLOWED_MIME_PREFIXES: readonly string[] = ["image/", "application/pdf"]

/** Human-readable label for allowed types */
export const ALLOWED_MIME_DESCRIPTION = "Images (JPEG, PNG, WEBP) or PDF documents"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the max allowed bytes for a given artifact type.
 */
export function getMaxBytes(artifactType: ArtifactType): number {
  return artifactType === "PROFILE_PHOTO"
    ? PROFILE_PHOTO_MAX_BYTES
    : DOCUMENT_MAX_BYTES
}

/**
 * Returns a human-readable size limit label for the given artifact type.
 */
export function getMaxSizeLabel(artifactType: ArtifactType): string {
  return artifactType === "PROFILE_PHOTO" ? "5 MB" : "10 MB"
}

/**
 * Strips the leading dot from a file extension if present.
 * Example: ".pdf" → "pdf", "pdf" → "pdf"
 */
export function normalizeFileExt(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex < 0) return ""
  return filename.slice(dotIndex + 1).toLowerCase().replace(/[^a-zA-Z0-9]/g, "")
}

// ─── Validators ──────────────────────────────────────────────────────────────

/**
 * Validates that a MIME type is allowed for upload.
 * Must start with "image/" or be "application/pdf".
 */
export function validateMimeType(mimeType: string): UploadValidationResult {
  const allowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
    mimeType.startsWith(prefix)
  )
  if (!allowed) {
    return {
      ok: false,
      error: {
        code: "MIME_NOT_ALLOWED",
        message: `File type not allowed. Only ${ALLOWED_MIME_DESCRIPTION} are accepted.`,
      },
    }
  }
  return { ok: true }
}

/**
 * Validates that a file is within the size limit for its artifact type.
 */
export function validateFileSize(
  fileSizeBytes: number,
  artifactType: ArtifactType
): UploadValidationResult {
  if (fileSizeBytes <= 0) {
    return {
      ok: false,
      error: {
        code: "FILE_EMPTY",
        message: "File is empty. Please select a valid file.",
      },
    }
  }

  const maxBytes = getMaxBytes(artifactType)
  if (fileSizeBytes > maxBytes) {
    return {
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File exceeds the ${getMaxSizeLabel(artifactType)} size limit for ${
          artifactType === "PROFILE_PHOTO" ? "profile photos" : "documents"
        }. Please select a smaller file.`,
      },
    }
  }

  return { ok: true }
}

/**
 * Runs all client-side validations for a File object before authorize call.
 * Returns first failure found, or { ok: true } if all pass.
 *
 * @param file   - The File object from the input[type=file] event
 * @param artifactType - "DOCUMENT" | "PROFILE_PHOTO"
 */
export function validateFile(
  file: File,
  artifactType: ArtifactType
): UploadValidationResult {
  const mimeResult = validateMimeType(file.type)
  if (!mimeResult.ok) return mimeResult

  const sizeResult = validateFileSize(file.size, artifactType)
  if (!sizeResult.ok) return sizeResult

  return { ok: true }
}

/**
 * Validates the FileList from an input event.
 * DVote MVP enforces single-file-per-artifact — rejects multiple files.
 *
 * @param files - FileList from HTMLInputElement.files
 * @param artifactType - "DOCUMENT" | "PROFILE_PHOTO"
 */
export function validateFileList(
  files: FileList | null,
  artifactType: ArtifactType
): UploadValidationResult {
  if (!files || files.length === 0) {
    return {
      ok: false,
      error: {
        code: "FILE_EMPTY",
        message: "No file selected. Please choose a file to upload.",
      },
    }
  }

  if (files.length > 1) {
    return {
      ok: false,
      error: {
        code: "MULTIPLE_FILES",
        message: "Only one file per upload is allowed.",
      },
    }
  }

  return validateFile(files[0], artifactType)
}
