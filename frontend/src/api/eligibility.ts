import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { EligibilityAssessmentResponse } from '@/types/eligibility'
import { DEMO_ASSESSMENTS } from '@/lib/demoData'

function isDemoMode(): boolean {
  const saved = localStorage.getItem('sgdts_demo_data_mode')
  return saved !== null ? saved === 'true' : true
}

export const eligibilityApi = {
  assess: async (applicationId: string): Promise<EligibilityAssessmentResponse> => {
    if (isDemoMode()) {
      return (
        DEMO_ASSESSMENTS[applicationId] || {
          id: `demo-eval-${Date.now()}`,
          applicationId,
          schemeId: 'e1a2b3c4-0001-4000-8000-000000000001',
          schemeConfigVersion: 1,
          outcome: 'ELIGIBLE',
          totalScore: 90,
          maxPossibleScore: 100,
          normalizedScore: 90,
          assessmentDetails: JSON.stringify([
            { criterionId: 'LAND_HOLDING_HECTARES', passed: true, score: 30, maxScore: 30, reason: 'Satisfies ceiling' },
            { criterionId: 'ANNUAL_INCOME', passed: true, score: 40, maxScore: 40, reason: 'Within income bracket' },
          ]),
          assessedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
      )
    }

    const res = await apiClient.post<ApiResponse<EligibilityAssessmentResponse>>(
      `/api/v1/applications/${applicationId}/eligibility-assessment`
    )
    return res.data.data
  },

  getAssessment: async (applicationId: string): Promise<EligibilityAssessmentResponse> => {
    if (isDemoMode()) {
      return (
        DEMO_ASSESSMENTS[applicationId] || {
          id: `demo-eval-${applicationId}`,
          applicationId,
          schemeId: 'e1a2b3c4-0001-4000-8000-000000000001',
          schemeConfigVersion: 1,
          outcome: 'ELIGIBLE',
          totalScore: 90,
          maxPossibleScore: 100,
          normalizedScore: 90,
          assessmentDetails: JSON.stringify([
            { criterionId: 'LAND_HOLDING_HECTARES', passed: true, score: 30, maxScore: 30, reason: 'Satisfies ceiling' },
            { criterionId: 'ANNUAL_INCOME', passed: true, score: 40, maxScore: 40, reason: 'Within income bracket' },
          ]),
          assessedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
      )
    }

    const res = await apiClient.get<ApiResponse<EligibilityAssessmentResponse>>(
      `/api/v1/applications/${applicationId}/eligibility-assessment`
    )
    return res.data.data
  },
}
