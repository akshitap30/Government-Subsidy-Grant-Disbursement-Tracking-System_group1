import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { schemesApi } from '@/api/schemes'
import { applicationsApi } from '@/api/applications'
import { beneficiariesApi } from '@/api/beneficiaries'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Send,
} from 'lucide-react'

export const ApplicationWizard: React.FC = () => {
  const { schemeId } = useParams<{ schemeId: string }>()
  const navigate = useNavigate()
  const { success, error, warning } = useToast()
  const { beneficiaryId, currentBeneficiary, setBeneficiaryId, setCurrentBeneficiary } = useAuth()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [requestedAmount, setRequestedAmount] = useState<number>(0)
  const [eligibilityData, setEligibilityData] = useState<Record<string, string>>({})
  const [declarationAgreed, setDeclarationAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Scheme
  const { data: scheme, isLoading: schemeLoading } = useQuery({
    queryKey: ['scheme-wizard', schemeId],
    queryFn: () => schemesApi.getScheme(schemeId!),
    enabled: Boolean(schemeId),
  })

  // Set default requested amount once scheme loads
  React.useEffect(() => {
    if (scheme && requestedAmount === 0) {
      setRequestedAmount(Number(scheme.minGrantAmount))
      // Prepopulate eligibility inputs
      const initialMap: Record<string, string> = {}
      scheme.criteria?.forEach((c) => {
        initialMap[c.criterionId] = c.expectedValue || ''
      })
      setEligibilityData(initialMap)
    }
  }, [scheme, requestedAmount])

  // Fetch all beneficiaries if no active beneficiary is selected
  const { data: allBeneficiaries } = useQuery({
    queryKey: ['beneficiaries-list-for-wizard'],
    queryFn: () => beneficiariesApi.listAll(0, 50),
    enabled: !beneficiaryId,
  })

  const handleCriterionChange = (criterionId: string, val: string) => {
    setEligibilityData((prev) => ({ ...prev, [criterionId]: val }))
  }

  const handleProceedToCriteria = () => {
    if (!beneficiaryId) {
      warning('Please choose or register a citizen identity first.', 'Citizen ID Required')
      return
    }
    if (!scheme) return
    if (requestedAmount < Number(scheme.minGrantAmount) || requestedAmount > Number(scheme.maxGrantAmount)) {
      warning(
        `Requested amount must be between ${formatCurrency(scheme.minGrantAmount)} and ${formatCurrency(scheme.maxGrantAmount)}.`,
        'Amount Out of Range'
      )
      return
    }
    setStep(2)
  }

  const handleProceedToReview = () => {
    // Check mandatory criteria
    if (scheme?.criteria) {
      for (const crit of scheme.criteria) {
        if (crit.mandatory && (!eligibilityData[crit.criterionId] || eligibilityData[crit.criterionId].trim() === '')) {
          warning(`Mandatory condition "${crit.description || crit.criterionId}" must be completed.`, 'Required Field')
          return
        }
      }
    }
    setStep(3)
  }

  const handleSubmitApplication = async () => {
    if (!declarationAgreed) {
      warning('You must accept the statutory citizen declaration to proceed.', 'Declaration Required')
      return
    }
    if (!scheme || !beneficiaryId) return

    try {
      setIsSubmitting(true)

      // Step 1: Create Draft
      const draft = await applicationsApi.createDraft({
        beneficiaryId,
        schemeId: scheme.id,
        requestedAmount,
        eligibilityData,
      })

      // Step 2: Submit Draft (triggers automated post-submission eligibility review & verification workflow)
      await applicationsApi.submitApplication(draft.id)

      success(
        `Application ${draft.referenceNumber} successfully registered and submitted for automated eligibility evaluation!`,
        'Application Submitted'
      )

      // Navigate to Tracker
      navigate(`/beneficiary/applications/${draft.id}/track`)
    } catch (err: any) {
      error(err.message || 'Failed to submit application', 'Submission Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (schemeLoading) {
    return <LoadingSpinner text="Initializing subsidy grant application form..." />
  }

  if (!scheme) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Scheme Not Found</h2>
        <Link to="/beneficiary/schemes">
          <Button variant="outline">Browse Available Schemes</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={`/beneficiary/schemes/${scheme.id}`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Scheme Dossier
        </Link>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { num: 1, title: '1. Grant Envelope' },
          { num: 2, title: '2. Eligibility Criteria' },
          { num: 3, title: '3. Review & Submit' },
        ].map((s) => {
          const isActive = step === s.num
          const isPassed = step > s.num
          return (
            <div
              key={s.num}
              className={`p-3 rounded-lg border text-center text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : isPassed
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {isPassed ? `✓ ${s.title}` : s.title}
            </div>
          )
        })}
      </div>

      {/* Step 1: Grant Envelope & Citizen Persona */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Sanctioned Grant Amount & Applicant Details</CardTitle>
            <CardDescription>
              Specify your grant funding requirement for <span className="font-semibold text-slate-800">{scheme.name}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Citizen Persona Check */}
            {!beneficiaryId ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Select Citizen Profile for Application
                </div>
                <p className="text-xs text-amber-700">
                  Select an existing citizen from the registry or register a new citizen profile:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="flex-1 h-9 px-3 text-xs rounded border border-amber-300 bg-white"
                    onChange={(e) => {
                      const found = allBeneficiaries?.content.find((b) => b.id === e.target.value)
                      if (found) {
                        setBeneficiaryId(found.id)
                        setCurrentBeneficiary(found)
                      }
                    }}
                  >
                    <option value="">-- Choose Citizen Profile --</option>
                    {allBeneficiaries?.content.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.fullName} ({b.district}, {b.state})
                      </option>
                    ))}
                  </select>
                  <Link to="/beneficiary/profile">
                    <Button variant="outline" size="sm" className="whitespace-nowrap">
                      Register New Citizen
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">
                    Applicant: {currentBeneficiary?.fullName || 'Active Citizen'}
                  </span>
                  <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                    ID: {beneficiaryId}
                  </div>
                </div>
                <Link to="/beneficiary/profile" className="text-blue-600 font-medium hover:underline">
                  Change Citizen
                </Link>
              </div>
            )}

            {/* Grant Amount Input */}
            <div className="space-y-2">
              <Input
                label="Requested Grant / Subsidy Amount (INR ₹)"
                type="number"
                step="100"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                helperText={`Permissible range: ${formatCurrency(scheme.minGrantAmount)} to ${formatCurrency(scheme.maxGrantAmount)}`}
                required
              />

              {/* Slider for convenience */}
              <input
                type="range"
                min={Number(scheme.minGrantAmount)}
                max={Number(scheme.maxGrantAmount)}
                step="500"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer mt-2"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                onClick={handleProceedToCriteria}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continue to Eligibility Questionnaire
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Eligibility Questionnaire */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Statutory Eligibility Questionnaire</CardTitle>
            <CardDescription>
              Provide responses to the criteria configured under <span className="font-semibold text-slate-800">{scheme.name}</span>. Responses are scored by the SGDTS Eligibility Engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {scheme.criteria?.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No specific criteria for this scheme. You can proceed directly to review.</p>
            ) : (
              <div className="space-y-4">
                {scheme.criteria?.map((crit, idx) => {
                  const currentValue = eligibilityData[crit.criterionId] || ''
                  return (
                    <div
                      key={crit.criterionId}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            {idx + 1}. {crit.description || crit.criterionId}
                            {crit.mandatory && <span className="text-rose-500 ml-1">*</span>}
                          </label>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            ID: {crit.criterionId} | Rule: {crit.type} | Weight: {crit.weight} pts
                          </div>
                        </div>
                        {crit.mandatory ? (
                          <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            Mandatory
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Score Weight: {crit.weight}
                          </span>
                        )}
                      </div>

                      {/* Render input based on criterion type */}
                      {crit.type === 'BOOLEAN' ? (
                        <div className="flex items-center gap-4 pt-1">
                          {['true', 'false'].map((val) => (
                            <label key={val} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={crit.criterionId}
                                value={val}
                                checked={currentValue === val}
                                onChange={(e) => handleCriterionChange(crit.criterionId, e.target.value)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              {val === 'true' ? 'Yes (Satisfied)' : 'No (Not Satisfied)'}
                            </label>
                          ))}
                        </div>
                      ) : crit.type === 'NUMERIC_MIN' || crit.type === 'NUMERIC_MAX' ? (
                        <Input
                          type="number"
                          placeholder={crit.expectedValue ? `Target: ${crit.expectedValue}` : 'Enter numeric value'}
                          value={currentValue}
                          onChange={(e) => handleCriterionChange(crit.criterionId, e.target.value)}
                        />
                      ) : (
                        <Input
                          type="text"
                          placeholder={crit.expectedValue ? `Expected: ${crit.expectedValue}` : 'Enter response value'}
                          value={currentValue}
                          onChange={(e) => handleCriterionChange(crit.criterionId, e.target.value)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Previous Step
              </Button>
              <Button variant="primary" size="sm" onClick={handleProceedToReview} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Proceed to Review & Affirmation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Review Application & Statutory Affirmation</CardTitle>
            <CardDescription>
              Carefully verify your application parameters before submission to the automated verification pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overview summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 font-medium">Selected Scheme:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{scheme.name}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Requested Grant Amount:</span>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {formatCurrency(requestedAmount)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Applicant:</span>
                  <div className="font-medium text-slate-800">{currentBeneficiary?.fullName || 'Active Citizen'}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Beneficiary UUID:</span>
                  <div className="font-mono text-slate-600">{beneficiaryId}</div>
                </div>
              </div>
            </div>

            {/* Criteria Responses Summary */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Declared Eligibility Criteria Values:
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-700">
                    <tr>
                      <th className="px-4 py-2">Condition ID</th>
                      <th className="px-4 py-2">Target / Rule</th>
                      <th className="px-4 py-2 text-right">Applicant Provided Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheme.criteria?.map((c) => (
                      <tr key={c.criterionId}>
                        <td className="px-4 py-2 font-mono font-medium text-slate-800">
                          {c.criterionId}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {c.type} {c.expectedValue ? `(${c.expectedValue})` : ''}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900">
                          {eligibilityData[c.criterionId] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statutory Declaration */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationAgreed}
                  onChange={(e) => setDeclarationAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-blue-950 font-medium leading-relaxed">
                  I hereby solemnly affirm that the demographic details and eligibility declarations submitted above are true, complete, and authentic. I understand that false statements will cause immediate rejection and legal disqualification under the National Direct Benefit Transfer Act.
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                Previous Step
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitApplication}
                isLoading={isSubmitting}
                disabled={!declarationAgreed}
                rightIcon={<Send className="h-4 w-4" />}
              >
                Submit Formal Application
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

