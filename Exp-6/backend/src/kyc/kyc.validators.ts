import { APP_CONSTANTS } from "../config/constants.js";
import { appError } from "../lib/errors.js";
import { parseCanonicalIdentity } from "../lib/validation/identity.js";

export type ParticipantType = "VOTER" | "CANDIDATE";

export interface KycSubmissionInput {
  wallet: string;
  electionId: string;
  constituencyId: string;
  participantType: ParticipantType;
  aadhaar: string;
  epic?: string | undefined;
  isAadhaarOnly?: boolean | undefined;
  reasonCode?: string | undefined;
  additionalEvidenceRefs?: string[] | undefined;
}

export interface ValidatedKycInput {
  wallet: string;
  electionId: string;
  constituencyId: string;
  participantType: ParticipantType;
  aadhaar: string;
  epic?: string | undefined;
  isAadhaarOnly: boolean;
  reasonCode: string | null;
  additionalEvidenceRefs: string[];
  canonical: {
    aadhaarCanonical: string;
    aadhaarHash: string;
    epicCanonical: string | null;
    epicHash: string | null;
  };
}

export function validateKycSubmissionInput(input: KycSubmissionInput): ValidatedKycInput {
  const isAadhaarOnly = Boolean(input.isAadhaarOnly);
  const reasonCode = (input.reasonCode ?? "").trim();
  const additionalEvidenceRefs = (input.additionalEvidenceRefs ?? []).filter((item) => item.trim().length > 0);

  if (input.participantType === "CANDIDATE") {
    if (!input.epic || input.epic.trim().length === 0) {
      throw appError.validation("Candidate KYC requires EPIC");
    }

    if (isAadhaarOnly) {
      throw appError.unprocessable("Candidate KYC cannot use Aadhaar-only fallback");
    }
  }

  if (isAadhaarOnly) {
    if (!reasonCode) {
      throw appError.validation("Aadhaar-only fallback requires reasonCode");
    }

    if (additionalEvidenceRefs.length < APP_CONSTANTS.aadhaarFallbackMinEvidenceRefs) {
      throw appError.validation(
        `Aadhaar-only fallback requires at least ${APP_CONSTANTS.aadhaarFallbackMinEvidenceRefs} additional evidence reference`
      );
    }
  }

  const canonical = parseCanonicalIdentity({
    aadhaar: input.aadhaar,
    epic: input.epic ?? null,
    electionId: input.electionId
  });

  if (!isAadhaarOnly && input.participantType === "VOTER" && !canonical.epicCanonical) {
    throw appError.validation("EPIC is required unless Aadhaar-only fallback is declared");
  }

  return {
    ...input,
    isAadhaarOnly,
    reasonCode: reasonCode.length > 0 ? reasonCode : null,
    additionalEvidenceRefs,
    canonical
  };
}
