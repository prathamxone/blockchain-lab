import { APP_CONSTANTS } from "../../config/constants.js";
import { appError } from "../errors.js";

export interface CursorPayload {
  createdAt: string;
  id: string;
  issuedAt: number;
}

export interface CursorPageOptions {
  limit: number;
  offset: number;
  cursor?: string;
}

export interface PaginationEnvelope {
  mode: "cursor";
  nextCursor: string | null;
  offsetFallback: {
    limit: number;
    offset: number;
  };
  orderKey: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function parseCursorPayload(rawCursor: string): CursorPayload {
  try {
    const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
    const payload = JSON.parse(decoded) as CursorPayload;

    if (!payload.id || !payload.createdAt || !payload.issuedAt) {
      throw new Error("Invalid payload");
    }

    if (Number.isNaN(new Date(payload.createdAt).getTime())) {
      throw new Error("Invalid createdAt");
    }

    return payload;
  } catch {
    throw appError.paginationCursorInvalid("Cursor is malformed");
  }
}

export function decodeCursor(rawCursor: string): CursorPayload {
  const payload = parseCursorPayload(rawCursor);

  const ageSec = Math.floor((Date.now() - payload.issuedAt) / 1000);
  if (ageSec > APP_CONSTANTS.paginationCursorTtlSec) {
    throw appError.paginationCursorInvalid("Cursor expired. Use offsetFallback to continue");
  }

  return payload;
}

export function normalizePageOptions(input: {
  limit?: number | undefined;
  offset?: number | undefined;
  cursor?: string | undefined;
}): CursorPageOptions {
  const limit = Math.min(
    Math.max(Math.floor(input.limit ?? APP_CONSTANTS.paginationDefaultLimit), 1),
    APP_CONSTANTS.paginationMaxLimit
  );

  const offset = Math.max(Math.floor(input.offset ?? 0), 0);
  const cursor = input.cursor?.trim() ? input.cursor.trim() : undefined;

  const result: CursorPageOptions = {
    limit,
    offset
  };

  if (cursor) {
    result.cursor = cursor;
  }

  return result;
}

export function buildPaginationEnvelope(input: {
  nextCursor: string | null;
  limit: number;
  offset: number;
}): PaginationEnvelope {
  return {
    mode: "cursor",
    nextCursor: input.nextCursor,
    offsetFallback: {
      limit: input.limit,
      offset: input.offset
    },
    orderKey: APP_CONSTANTS.orderKey
  };
}
