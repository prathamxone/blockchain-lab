import { describe, expect, it } from "vitest";

import { AppError } from "../../src/lib/errors.js";
import { generateVerhoeffCheckDigit } from "../../src/lib/crypto/verhoeff.js";
import {
  AADHAAR_REGEX,
  EPIC_REGEX,
  normalizeAadhaar,
  normalizeEpic,
  parseCanonicalIdentity
} from "../../src/lib/validation/identity.js";

function buildValidAadhaar(base11Digits: string): string {
  const checkDigit = generateVerhoeffCheckDigit(base11Digits);
  return `${base11Digits}${checkDigit}`;
}

describe("identity canonicalization", () => {
  it("normalizes EPIC and Aadhaar values", () => {
    expect(normalizeEpic(" ab-c 123_4567 ")).toBe("ABC1234567");
    expect(normalizeAadhaar("1234-5678 9012")).toBe("123456789012");
  });

  it("accepts valid canonical identity with hashes", () => {
    const aadhaar = buildValidAadhaar("12345678901");

    const parsed = parseCanonicalIdentity({
      aadhaar,
      epic: "abc-1234567",
      electionId: "E-001"
    });

    expect(parsed.aadhaarCanonical).toBe(aadhaar);
    expect(parsed.epicCanonical).toBe("ABC1234567");
    expect(AADHAAR_REGEX.test(parsed.aadhaarCanonical)).toBe(true);
    expect(EPIC_REGEX.test(parsed.epicCanonical!)).toBe(true);
    expect(parsed.aadhaarHash).toHaveLength(64);
    expect(parsed.epicHash).toHaveLength(64);
  });

  it("rejects invalid Aadhaar format with validation error", () => {
    try {
      parseCanonicalIdentity({
        aadhaar: "12345",
        epic: "ABC1234567",
        electionId: "E-001"
      });
      throw new Error("Expected parseCanonicalIdentity to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.status).toBe(400);
      expect(appErr.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects Aadhaar checksum mismatches with unprocessable error", () => {
    const aadhaar = buildValidAadhaar("12345678901");
    const invalidChecksumAadhaar = `${aadhaar.slice(0, 11)}${aadhaar.endsWith("0") ? "1" : "0"}`;

    try {
      parseCanonicalIdentity({
        aadhaar: invalidChecksumAadhaar,
        epic: "ABC1234567",
        electionId: "E-001"
      });
      throw new Error("Expected parseCanonicalIdentity to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.status).toBe(422);
      expect(appErr.code).toBe("UNPROCESSABLE");
    }
  });

  it("rejects EPIC values that fail canonical regex", () => {
    const aadhaar = buildValidAadhaar("12345678901");

    try {
      parseCanonicalIdentity({
        aadhaar,
        epic: "AB12",
        electionId: "E-001"
      });
      throw new Error("Expected parseCanonicalIdentity to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appErr = error as AppError;
      expect(appErr.status).toBe(400);
      expect(appErr.code).toBe("VALIDATION_ERROR");
    }
  });
});
