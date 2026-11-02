export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ELIGIBILITY_REVIEW'
  | 'UNDER_VERIFICATION'
  | 'RETURNED_FOR_CORRECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'INELIGIBLE'
  | 'CANCELLED'

export interface ApplicationResponse {
  id: string
  referenceNumber: string
  beneficiaryId: string
  schemeId: string
  schemeConfigVersion: number
  requestedAmount: number
  status: ApplicationStatus
  submittedAt?: string
  eligibilityAssessmentId?: string
  currentVerificationStage?: string
  statusHistory: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateApplicationRequest {
  beneficiaryId: string
  schemeId: string
  requestedAmount: number
  eligibilityData?: Record<string, string>
}

export interface UpdateApplicationRequest {
  requestedAmount?: number
  eligibilityData?: Record<string, string>
}

