import { apiClient } from './client'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type {
  ApplicationResponse,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@/types/application'
import { DEMO_APPLICATIONS } from '@/lib/demoData'

function isDemoMode(): boolean {
  const saved = localStorage.getItem('sgdts_demo_data_mode')
  return saved !== null ? saved === 'true' : true
}

let localApplications = [...DEMO_APPLICATIONS]

export interface ListApplicationsParams {
  beneficiaryId?: string
  schemeId?: string
  status?: ApplicationStatus
  page?: number
  size?: number
}

export const applicationsApi = {
  createDraft: async (data: CreateApplicationRequest): Promise<ApplicationResponse> => {
    if (isDemoMode()) {
      const now = new Date().toISOString()
      const newApp: ApplicationResponse = {
        id: `demo-app-${Date.now()}`,
        referenceNumber: `APP-${Date.now().toString().slice(-10)}`,
        beneficiaryId: data.beneficiaryId,
        schemeId: data.schemeId,
        schemeConfigVersion: 1,
        requestedAmount: data.requestedAmount,
        status: 'DRAFT',
        statusHistory: [`DRAFT:${now}`],
        createdAt: now,
        updatedAt: now,
      }
      localApplications = [newApp, ...localApplications]
      return newApp
    }

    const res = await apiClient.post<ApiResponse<ApplicationResponse>>(
      '/api/v1/applications',
      data
    )
    return res.data.data
  },

  getApplication: async (id: string): Promise<ApplicationResponse> => {
    if (isDemoMode()) {
      const found = localApplications.find((a) => a.id === id)
      if (found) return found
      return localApplications[0]
    }

    const res = await apiClient.get<ApiResponse<ApplicationResponse>>(
      `/api/v1/applications/${id}`
    )
    return res.data.data
  },

  getApplicationStatus: async (id: string): Promise<ApplicationResponse> => {
    if (isDemoMode()) {
      const found = localApplications.find((a) => a.id === id)
      if (found) return found
      return localApplications[0]
    }

    const res = await apiClient.get<ApiResponse<ApplicationResponse>>(
      `/api/v1/applications/${id}/status`
    )
    return res.data.data
  },

  listApplications: async (params: ListApplicationsParams = {}): Promise<PagedResponse<ApplicationResponse>> => {
    if (isDemoMode()) {
      const { page = 0, size = 20, beneficiaryId, schemeId, status } = params
      let filtered = localApplications
      if (beneficiaryId) filtered = filtered.filter((a) => a.beneficiaryId === beneficiaryId)
      if (schemeId) filtered = filtered.filter((a) => a.schemeId === schemeId)
      if (status) filtered = filtered.filter((a) => a.status === status)

      return {
        content: filtered.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      }
    }

    const { page = 0, size = 20, ...rest } = params
    const queryParams: Record<string, string | number> = { page, size }
    if (rest.beneficiaryId) queryParams.beneficiaryId = rest.beneficiaryId
    if (rest.schemeId) queryParams.schemeId = rest.schemeId
    if (rest.status) queryParams.status = rest.status

    const res = await apiClient.get<ApiResponse<PagedResponse<ApplicationResponse>>>(
      '/api/v1/applications',
      { params: queryParams }
    )
    return res.data.data
  },

  updateDraft: async (id: string, data: UpdateApplicationRequest): Promise<ApplicationResponse> => {
    if (isDemoMode()) {
      const idx = localApplications.findIndex((a) => a.id === id)
      if (idx !== -1) {
        localApplications[idx] = {
          ...localApplications[idx],
          requestedAmount: data.requestedAmount || localApplications[idx].requestedAmount,
          updatedAt: new Date().toISOString(),
        }
        return localApplications[idx]
      }
      throw new Error('Application not found')
    }

    const res = await apiClient.put<ApiResponse<ApplicationResponse>>(
      `/api/v1/applications/${id}`,
      data
    )
    return res.data.data
  },

  submitApplication: async (id: string): Promise<ApplicationResponse> => {
    if (isDemoMode()) {
      const now = new Date().toISOString()
      const idx = localApplications.findIndex((a) => a.id === id)
      if (idx !== -1) {
        localApplications[idx] = {
          ...localApplications[idx],
          status: 'UNDER_VERIFICATION',
          submittedAt: now,
          currentVerificationStage: 'FIELD_VERIFICATION',
          statusHistory: [
            ...localApplications[idx].statusHistory,
            `SUBMITTED:${now}`,
            `ELIGIBILITY_REVIEW:${now}`,
            `UNDER_VERIFICATION:${now}`,
          ],
          updatedAt: now,
        }
        return localApplications[idx]
      }
      throw new Error('Application not found')
    }

    const res = await apiClient.post<ApiResponse<ApplicationResponse>>(
      `/api/v1/applications/${id}/submit`
    )
    return res.data.data
  },

  cancelApplication: async (id: string): Promise<ApplicationResponse> => {
    if (isDemoMode()) {
      const now = new Date().toISOString()
      const idx = localApplications.findIndex((a) => a.id === id)
      if (idx !== -1) {
        localApplications[idx] = {
          ...localApplications[idx],
          status: 'CANCELLED',
          statusHistory: [...localApplications[idx].statusHistory, `CANCELLED:${now}`],
          updatedAt: now,
        }
        return localApplications[idx]
      }
      throw new Error('Application not found')
    }

    const res = await apiClient.post<ApiResponse<ApplicationResponse>>(
      `/api/v1/applications/${id}/cancel`
    )
    return res.data.data
  },
}
