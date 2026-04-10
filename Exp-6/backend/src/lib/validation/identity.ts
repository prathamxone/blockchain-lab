import { createHash } from "node:crypto";

import { env } from "../../config/env.js";
import { appError } from "../errors.js";
import { isVerhoeffValid } from "../crypto/verhoeff.js";

export const EPIC_REGEX = /^[A-Z]{3}[0-9]{7}$/;
export const AADHAAR_REGEX = /^[0-9]{12}$/;

export interface CanonicalIdentity {
  aadhaarCanonical: string;
  aadhaarHash: string;
  epicCanonical: string | null;
  epicHash: string | null;
}

export function normalizeEpic(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function normalizeAadhaar(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function hashIdentity(docType: "AADHAAR" | "EPIC", canonicalId: string, electionId: string): string {
  const preimage = `DVOTE_V1|${docType}|${canonicalId}|${electionId}|${env.KYC_HASH_SALT}`;
  return createHash("sha256").update(preimage).digest("hex");
}

export function parseCanonicalIdentity(input: {
  aadhaar: string;
  epic?: string | null;
  electionId: string;
}): CanonicalIdentity {
  const aadhaarCanonical = normalizeAadhaar(input.aadhaar);
  if (!AADHAAR_REGEX.test(aadhaarCanonical)) {
    throw appError.validation("Aadhaar must be a 12-digit number");
  }

  if (!isVerhoeffValid(aadhaarCanonical)) {
    throw appError.unprocessable("Aadhaar checksum is invalid");
  }

  const epicRaw = (input.epic ?? "").trim();
  const epicCanonical = epicRaw.length > 0 ? normalizeEpic(epicRaw) : null;

  if (epicCanonical && !EPIC_REGEX.test(epicCanonical)) {
    throw appError.validation("EPIC must match pattern AAA9999999");
  }

  return {
    aadhaarCanonical,
    aadhaarHash: hashIdentity("AADHAAR", aadhaarCanonical, input.electionId),
    epicCanonical,
    epicHash: epicCanonical ? hashIdentity("EPIC", epicCanonical, input.electionId) : null
  };
}
