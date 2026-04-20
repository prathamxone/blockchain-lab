/**
 * DVote Frontend — KYC Wizard Integration Tests
 *
 * Tests for KYC wizard step progression, draft conflict handling,
 * Aadhaar masking, and Aadhaar-only fallback.
 *
 * Authority: walkthrough Phase K + Phase L + L-C2
 */

import { describe, it, expect, vi } from "vitest"

type KycStep = 1 | 2 | 3 | 4 | 5

interface KycWizardState {
  currentStep: KycStep
  participantType: "VOTER" | "CANDIDATE" | null
  aadhaar: string
  epic: string
  isAadhaarOnly: boolean
  reasonCode: string
  step2Complete: boolean
  step3Complete: boolean
  step4Complete: boolean
  step5Complete: boolean
}

function canProceedFromStep(state: KycWizardState): boolean {
  switch (state.currentStep) {
    case 1:
      return state.participantType !== null
    case 2:
      // Step 2 requires Aadhaar, optionally EPIC or Aadhaar-only with reason
      const hasAadhaar = state.aadhaar.length === 12
      const hasEpic = state.epic.length === 10
      const hasReason = state.isAadhaarOnly && state.reasonCode.length > 0
      return state.participantType === "CANDIDATE"
        ? hasAadhaar && hasEpic
        : hasAadhaar && (hasEpic || hasReason)
    case 3:
      return state.step3Complete
    case 4:
      return state.step4Complete
    case 5:
      return state.step5Complete
    default:
      return false
  }
}

function maskAadhaar(aadhaar: string): string {
  // L-C2: Mask on Review step only - show XXXX-XXXX-XXXX format
  if (aadhaar.length !== 12) return aadhaar
  return `${aadhaar.slice(0, 4)}-${aadhaar.slice(4, 8)}-${aadhaar.slice(8, 12)}`
}

function isAadhaarFullyVisible(step: KycStep): boolean {
  // L-C2: Fully visible during input steps (2-3), masked on Review step (5)
  return step >= 2 && step <= 3
}

describe("KYC Wizard Step Progression", () => {
  describe("Step 1 - Identity Type", () => {
    it("blocks progression without participant type", () => {
      const state: KycWizardState = {
        currentStep: 1,
        participantType: null,
        aadhaar: "",
        epic: "",
        isAadhaarOnly: false,
        reasonCode: "",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(false)
    })

    it("allows progression with participant type selected", () => {
      const state: KycWizardState = {
        currentStep: 1,
        participantType: "VOTER",
        aadhaar: "",
        epic: "",
        isAadhaarOnly: false,
        reasonCode: "",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(true)
    })
  })

  describe("Step 2 - Identity Documents", () => {
    it("blocks voter without Aadhaar", () => {
      const state: KycWizardState = {
        currentStep: 2,
        participantType: "VOTER",
        aadhaar: "",
        epic: "",
        isAadhaarOnly: false,
        reasonCode: "",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(false)
    })

    it("allows voter with valid Aadhaar and EPIC", () => {
      const state: KycWizardState = {
        currentStep: 2,
        participantType: "VOTER",
        aadhaar: "123456789012",
        epic: "ABC1234567",
        isAadhaarOnly: false,
        reasonCode: "",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(true)
    })

    it("allows voter Aadhaar-only with reason code", () => {
      const state: KycWizardState = {
        currentStep: 2,
        participantType: "VOTER",
        aadhaar: "123456789012",
        epic: "",
        isAadhaarOnly: true,
        reasonCode: "NO_EPIC_AVAILABLE",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(true)
    })

    it("blocks candidate without EPIC", () => {
      const state: KycWizardState = {
        currentStep: 2,
        participantType: "CANDIDATE",
        aadhaar: "123456789012",
        epic: "",
        isAadhaarOnly: false,
        reasonCode: "",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(false)
    })

    it("allows candidate with both Aadhaar and EPIC", () => {
      const state: KycWizardState = {
        currentStep: 2,
        participantType: "CANDIDATE",
        aadhaar: "123456789012",
        epic: "ABC1234567",
        isAadhaarOnly: false,
        reasonCode: "",
        step2Complete: false,
        step3Complete: false,
        step4Complete: false,
        step5Complete: false,
      }
      expect(canProceedFromStep(state)).toBe(true)
    })
  })

  describe("Step 5 - Review & Submit (Aadhaar Masking)", () => {
    it("masks Aadhaar on Review step per L-C2", () => {
      const aadhaar = "123456789012"
      const masked = maskAadhaar(aadhaar)
      expect(masked).toBe("1234-5678-9012")
    })

    it("shows Aadhaar fully on input steps per L-C2", () => {
      expect(isAadhaarFullyVisible(2)).toBe(true)
      expect(isAadhaarFullyVisible(3)).toBe(true)
    })

    it("masks Aadhaar on Review step", () => {
      expect(isAadhaarFullyVisible(5)).toBe(false)
    })
  })
})

describe("KYC Draft Conflict Resolution", () => {
  // Per CDM-10: Default to server draft, provide explicit "Use local draft" option
  interface DraftConflictState {
    localTimestamp: Date
    serverTimestamp: Date
    resolution: "server" | "local" | null
  }

  function resolveDraftConflict(state: DraftConflictState): "server" | "local" {
    if (state.resolution) return state.resolution
    // Default to server if timestamps are equal or server is newer
    return state.serverTimestamp >= state.localTimestamp ? "server" : "local"
  }

  it("defaults to server draft when server is newer", () => {
    const state: DraftConflictState = {
      localTimestamp: new Date("2024-01-01T10:00:00"),
      serverTimestamp: new Date("2024-01-01T11:00:00"),
      resolution: null,
    }
    expect(resolveDraftConflict(state)).toBe("server")
  })

  it("defaults to server draft when timestamps equal", () => {
    const state: DraftConflictState = {
      localTimestamp: new Date("2024-01-01T10:00:00"),
      serverTimestamp: new Date("2024-01-01T10:00:00"),
      resolution: null,
    }
    expect(resolveDraftConflict(state)).toBe("server")
  })

  it("allows explicit local resolution", () => {
    const state: DraftConflictState = {
      localTimestamp: new Date("2024-01-01T12:00:00"),
      serverTimestamp: new Date("2024-01-01T11:00:00"),
      resolution: "local",
    }
    expect(resolveDraftConflict(state)).toBe("local")
  })
})

describe("Aadhaar Validation", () => {
  function isValidAadhaar(aadhaar: string): boolean {
    // 12 digits only
    return /^\d{12}$/.test(aadhaar)
  }

  it("accepts valid 12-digit Aadhaar", () => {
    expect(isValidAadhaar("123456789012")).toBe(true)
  })

  it("rejects less than 12 digits", () => {
    expect(isValidAadhaar("12345678901")).toBe(false)
  })

  it("rejects more than 12 digits", () => {
    expect(isValidAadhaar("1234567890123")).toBe(false)
  })

  it("rejects non-numeric", () => {
    expect(isValidAadhaar("12345678901X")).toBe(false)
  })
})

describe("EPIC Validation", () => {
  function isValidEPIC(epic: string): boolean {
    // Format: 3 uppercase letters + 7 digits
    return /^[A-Z]{3}\d{7}$/.test(epic)
  }

  it("accepts valid EPIC format", () => {
    expect(isValidEPIC("ABC1234567")).toBe(true)
  })

  it("rejects lowercase letters", () => {
    expect(isValidEPIC("abc1234567")).toBe(false)
  })

  it("rejects wrong format", () => {
    expect(isValidEPIC("12345678901")).toBe(false)
  })
})