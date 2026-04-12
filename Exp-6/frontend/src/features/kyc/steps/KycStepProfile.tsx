/**
 * DVote Frontend — KycStepProfile (KYC Wizard Step 3)
 *
 * Profile details form: name, date of birth, and address.
 * Values are stored in kyc-wizard-store step3 (in-memory only — L-B1).
 * These values are sent along with the KYC submission payload.
 *
 * Validation:
 *   - fullName: required, minimum 2 characters
 *   - dateOfBirth: required, must be a plausible date (not in future)
 *   - addressLine1: required
 *   - city: required
 *   - state: required
 *   - pincode: required, 6-digit India PIN code
 *
 * Authority: walkthrough Phase K
 */

import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useKycWizardStore } from "@/state/kyc-wizard-store"

// ─── Props ────────────────────────────────────────────────────────────────────

interface KycStepProfileProps {
  onNext: () => void
  onBack: () => void
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ProfileValidation {
  fullNameError: string | null
  dateOfBirthError: string | null
  addressLine1Error: string | null
  cityError: string | null
  stateError: string | null
  pincodeError: string | null
}

function validateProfile(values: {
  fullName: string
  dateOfBirth: string
  addressLine1: string
  city: string
  state: string
  pincode: string
}): ProfileValidation {
  const nameError =
    values.fullName.trim().length < 2
      ? "Full name must be at least 2 characters"
      : null

  let dobError: string | null = null
  if (!values.dateOfBirth) {
    dobError = "Date of birth is required"
  } else {
    const dob = new Date(values.dateOfBirth)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (isNaN(dob.getTime())) {
      dobError = "Enter a valid date"
    } else if (dob >= today) {
      dobError = "Date of birth must be in the past"
    }
  }

  const addr1Error =
    values.addressLine1.trim().length < 3
      ? "Address line 1 is required"
      : null

  const cityError =
    values.city.trim().length < 2 ? "City is required" : null

  const stateError =
    values.state.trim().length < 2 ? "State is required" : null

  const pincodeError =
    !/^\d{6}$/.test(values.pincode.trim())
      ? "Enter a valid 6-digit PIN code"
      : null

  return {
    fullNameError: nameError,
    dateOfBirthError: dobError,
    addressLine1Error: addr1Error,
    cityError,
    stateError,
    pincodeError,
  }
}

// ─── KycStepProfile component ─────────────────────────────────────────────────

/**
 * Step 3 of KYC Wizard — Profile details (name, DOB, address).
 */
export function KycStepProfile({ onNext, onBack }: KycStepProfileProps) {
  const profileData = useKycWizardStore((s) => s.formData.step3)
  const updateStep3 = useKycWizardStore((s) => s.updateStep3)

  const [touched, setTouched] = useState({
    fullName: false,
    dateOfBirth: false,
    addressLine1: false,
    city: false,
    state: false,
    pincode: false,
  })
  const [submitted, setSubmitted] = useState(false)

  const validation = validateProfile(profileData)

  const hasErrors =
    !!validation.fullNameError ||
    !!validation.dateOfBirthError ||
    !!validation.addressLine1Error ||
    !!validation.cityError ||
    !!validation.stateError ||
    !!validation.pincodeError

  const handleNext = () => {
    setSubmitted(true)
    setTouched({
      fullName: true,
      dateOfBirth: true,
      addressLine1: true,
      city: true,
      state: true,
      pincode: true,
    })
    if (!hasErrors) onNext()
  }

  const fieldClass = (hasError: boolean) =>
    cn(hasError && "border-destructive focus-visible:ring-destructive")

  const showError = (field: keyof typeof touched): boolean =>
    (touched[field] || submitted) && !!validation[`${field}Error` as keyof ProfileValidation]

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide your personal information for identity verification.
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="kyc-full-name">
          Full Name <span className="text-destructive" aria-label="required">*</span>
        </Label>
        <Input
          id="kyc-full-name"
          type="text"
          placeholder="As it appears on your Aadhaar"
          value={profileData.fullName}
          onChange={(e) => updateStep3({ fullName: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
          className={fieldClass(showError("fullName"))}
          aria-invalid={showError("fullName")}
          aria-describedby={showError("fullName") ? "kyc-name-error" : undefined}
          autoComplete="name"
        />
        {showError("fullName") && (
          <p id="kyc-name-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {validation.fullNameError}
          </p>
        )}
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="kyc-dob">
          Date of Birth <span className="text-destructive" aria-label="required">*</span>
        </Label>
        <Input
          id="kyc-dob"
          type="date"
          value={profileData.dateOfBirth}
          onChange={(e) => updateStep3({ dateOfBirth: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, dateOfBirth: true }))}
          className={fieldClass(showError("dateOfBirth"))}
          aria-invalid={showError("dateOfBirth")}
          aria-describedby={showError("dateOfBirth") ? "kyc-dob-error" : undefined}
          max={new Date().toISOString().split("T")[0]}
          autoComplete="bday"
        />
        {showError("dateOfBirth") && (
          <p id="kyc-dob-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {validation.dateOfBirthError}
          </p>
        )}
      </div>

      {/* Address Line 1 */}
      <div className="space-y-2">
        <Label htmlFor="kyc-addr1">
          Address Line 1 <span className="text-destructive" aria-label="required">*</span>
        </Label>
        <Input
          id="kyc-addr1"
          type="text"
          placeholder="House/Flat no., Street, Area"
          value={profileData.addressLine1}
          onChange={(e) => updateStep3({ addressLine1: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, addressLine1: true }))}
          className={fieldClass(showError("addressLine1"))}
          aria-invalid={showError("addressLine1")}
          aria-describedby={showError("addressLine1") ? "kyc-addr1-error" : undefined}
          autoComplete="address-line1"
        />
        {showError("addressLine1") && (
          <p id="kyc-addr1-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {validation.addressLine1Error}
          </p>
        )}
      </div>

      {/* Address Line 2 (optional) */}
      <div className="space-y-2">
        <Label htmlFor="kyc-addr2">
          Address Line 2{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="kyc-addr2"
          type="text"
          placeholder="Landmark, Colony (optional)"
          value={profileData.addressLine2}
          onChange={(e) => updateStep3({ addressLine2: e.target.value })}
          autoComplete="address-line2"
        />
      </div>

      {/* City + State row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kyc-city">
            City <span className="text-destructive" aria-label="required">*</span>
          </Label>
          <Input
            id="kyc-city"
            type="text"
            placeholder="Mumbai"
            value={profileData.city}
            onChange={(e) => updateStep3({ city: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, city: true }))}
            className={fieldClass(showError("city"))}
            aria-invalid={showError("city")}
            aria-describedby={showError("city") ? "kyc-city-error" : undefined}
            autoComplete="address-level2"
          />
          {showError("city") && (
            <p id="kyc-city-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {validation.cityError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="kyc-state">
            State <span className="text-destructive" aria-label="required">*</span>
          </Label>
          <Input
            id="kyc-state"
            type="text"
            placeholder="Maharashtra"
            value={profileData.state}
            onChange={(e) => updateStep3({ state: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, state: true }))}
            className={fieldClass(showError("state"))}
            aria-invalid={showError("state")}
            aria-describedby={showError("state") ? "kyc-state-error" : undefined}
            autoComplete="address-level1"
          />
          {showError("state") && (
            <p id="kyc-state-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {validation.stateError}
            </p>
          )}
        </div>
      </div>

      {/* Pincode */}
      <div className="space-y-2">
        <Label htmlFor="kyc-pincode">
          PIN Code <span className="text-destructive" aria-label="required">*</span>
        </Label>
        <Input
          id="kyc-pincode"
          type="text"
          inputMode="numeric"
          placeholder="400001"
          value={profileData.pincode}
          onChange={(e) =>
            updateStep3({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
          }
          onBlur={() => setTouched((t) => ({ ...t, pincode: true }))}
          maxLength={6}
          className={fieldClass(showError("pincode"))}
          aria-invalid={showError("pincode")}
          aria-describedby={showError("pincode") ? "kyc-pincode-error" : undefined}
          autoComplete="postal-code"
        />
        {showError("pincode") && (
          <p id="kyc-pincode-error" role="alert" className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {validation.pincodeError}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button id="kyc-step3-back" onClick={onBack} variant="outline" type="button">
          Back
        </Button>
        <Button id="kyc-step3-next" onClick={handleNext} type="button">
          Continue
        </Button>
      </div>
    </div>
  )
}
