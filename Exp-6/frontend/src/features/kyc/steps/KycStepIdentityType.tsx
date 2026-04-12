/**
 * DVote Frontend — KycStepIdentityType (KYC Wizard Step 1)
 *
 * Identity type selection: VOTER or CANDIDATE.
 * This selection drives the entire document and validation flow in Steps 2–5.
 *
 * CANDIDATE path: EPIC + Aadhaar both mandatory. Aadhaar-only fallback NOT allowed.
 * VOTER path:     EPIC + Aadhaar standard, OR Aadhaar-only with mandatory reason code.
 *
 * Authority: walkthrough Phase K, backend kyc.validators.ts constraint
 */

import { User, Award } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useKycWizardStore, type ParticipantType } from "@/state/kyc-wizard-store"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycStepIdentityTypeProps {
  /** Called when user clicks Next after selecting a type */
  onNext: () => void
}

// ─── Role card config ─────────────────────────────────────────────────────────

interface IdentityOption {
  type: ParticipantType
  icon: React.ReactNode
  title: string
  description: string
  requirements: string[]
}

const IDENTITY_OPTIONS: IdentityOption[] = [
  {
    type: "VOTER",
    icon: <User className="size-6" aria-hidden="true" />,
    title: "Voter",
    description: "Register as a voter for this election.",
    requirements: [
      "Aadhaar number (mandatory)",
      "EPIC voter ID card (recommended)",
      "Aadhaar-only fallback available with mandatory reason code",
    ],
  },
  {
    type: "CANDIDATE",
    icon: <Award className="size-6" aria-hidden="true" />,
    title: "Candidate",
    description: "Register as a candidate to participate in this election.",
    requirements: [
      "Aadhaar number (mandatory)",
      "EPIC voter ID card (mandatory for candidates)",
      "Aadhaar-only fallback is NOT permitted for candidates",
    ],
  },
]

// ─── KycStepIdentityType component ───────────────────────────────────────────

/**
 * Step 1 of KYC Wizard — identity type selector.
 * Drives the entire document/validation flow downstream.
 */
export function KycStepIdentityType({ onNext }: KycStepIdentityTypeProps) {
  const participantType = useKycWizardStore(
    (s) => s.formData.step1.participantType,
  )
  const updateStep1 = useKycWizardStore((s) => s.updateStep1)

  const selectType = (type: ParticipantType) => {
    updateStep1({ participantType: type })
    // Clear Aadhaar-only path if switching to CANDIDATE
    if (type === "CANDIDATE") {
      useKycWizardStore.getState().updateStep2({ isAadhaarOnly: false, reasonCode: "" })
    }
  }

  const handleNext = () => {
    if (!participantType) return
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          What is your role in this election?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your selection determines the documents required for KYC verification.
        </p>
      </div>

      {/* Identity Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {IDENTITY_OPTIONS.map((option) => {
          const isSelected = participantType === option.type
          return (
            <button
              key={option.type}
              id={`kyc-identity-type-${option.type.toLowerCase()}`}
              type="button"
              onClick={() => selectType(option.type)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left",
                "transition-all duration-150 focus:outline-none focus-visible:ring-2",
                "focus-visible:ring-ring focus-visible:ring-offset-2",
                "hover:border-primary/60 hover:bg-accent/40",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card",
              )}
            >
              {/* Icon and title */}
              <div
                className={cn(
                  "flex items-center gap-2 font-semibold text-base",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                <span
                  className={cn(
                    "rounded-lg p-2",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {option.icon}
                </span>
                {option.title}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">{option.description}</p>

              {/* Requirements list */}
              <ul className="text-xs text-muted-foreground space-y-1 list-none">
                {option.requirements.map((req) => (
                  <li key={req} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-primary">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <Button
          id="kyc-step1-next"
          onClick={handleNext}
          disabled={!participantType}
          className="min-w-[120px]"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
