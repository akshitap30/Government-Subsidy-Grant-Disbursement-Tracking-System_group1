export type EligibilityOutcome = 'ELIGIBLE' | 'INELIGIBLE' | 'INCOMPLETE'

export interface CriterionResult {
  criterionId: string
  passed: boolean
  score: number
  maxScore: number
  reason: string
}

export interface EligibilityAssessmentResponse {
  id: string
  applicationId: string
  schemeId: string
  schemeConfigVersion: number
  outcome: EligibilityOutcome
  totalScore: number
  maxPossibleScore: number
  normalizedScore: number
  assessmentDetails: string // JSON representation of List<CriterionResult>
  assessedAt: string
  createdAt: string
}

