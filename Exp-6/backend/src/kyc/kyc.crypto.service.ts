import { createHash } from "node:crypto";

import { encryptJsonEnvelope } from "../lib/crypto/aes-gcm.js";

interface BuildKycEnvelopeInput {
  participantType: "VOTER" | "CANDIDATE";
  aadhaarCanonical: string;
  epicCanonical: string | null;
  isAadhaarOnly: boolean;
  reasonCode: string | null;
  additionalEvidenceRefs: string[];
}

interface BuildKycEnvelopeResult {
  encryptedPayload: string;
  encryptedDek: string;
  iv: string;
  authTag: string;
  keyVersion: string;
  reasonCodeHash: string | null;
}

function hashReasonCode(reasonCode: string): string {
  return createHash("sha256").update(reasonCode).digest("hex");
}

export const kycCryptoService = {
  buildEncryptedIdentityEnvelope(input: BuildKycEnvelopeInput): BuildKycEnvelopeResult {
    const envelopePayload = {
      participantType: input.participantType,
      aadhaar: input.aadhaarCanonical,
      epic: input.epicCanonical,
      isAadhaarOnly: input.isAadhaarOnly,
      reasonCode: input.reasonCode,
      additionalEvidenceRefs: input.additionalEvidenceRefs
    };

    const encrypted = encryptJsonEnvelope(envelopePayload);
    const reasonCodeHash = input.reasonCode ? hashReasonCode(input.reasonCode) : null;

    return {
      ...encrypted,
      reasonCodeHash
    };
  }
};
