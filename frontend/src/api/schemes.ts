import { apiClient } from './client'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type {
  SchemeResponse,
  CreateSchemeRequest,
  UpdateSchemeRequest,
  CriterionDto,
  RoutingRuleDto,
  SchemeStatus,
} from '@/types/scheme'
import { DEMO_SCHEMES } from '@/lib/demoData'

function isDemoMode(): boolean {
  const saved = localStorage.getItem('sgdts_demo_data_mode')
  return saved !== null ? saved === 'true' : true
}

let localSchemes = [...DEMO_SCHEMES]

export const schemesApi = {
  listSchemes: async (status?: SchemeStatus, page = 0, size = 20): Promise<PagedResponse<SchemeResponse>> => {
    if (isDemoMode()) {
      let filtered = localSchemes
      if (status) {
        filtered = localSchemes.filter((s) => s.status === status)
      }
      return {
        content: filtered.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      }
    }

    const params: Record<string, string | number> = { page, size }
    if (status) params.status = status
    const res = await apiClient.get<ApiResponse<PagedResponse<SchemeResponse>>>(
      '/api/v1/schemes',
      { params }
    )
    return res.data.data
  },

  getScheme: async (id: string): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const found = localSchemes.find((s) => s.id === id)
      if (found) return found
      throw new Error(`Scheme ${id} not found in demo registry`)
    }

    const res = await apiClient.get<ApiResponse<SchemeResponse>>(`/api/v1/schemes/${id}`)
    return res.data.data
  },

  createScheme: async (data: CreateSchemeRequest): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const newScheme: SchemeResponse = {
        id: `demo-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        status: 'DRAFT',
        minGrantAmount: data.minGrantAmount,
        maxGrantAmount: data.maxGrantAmount,
        configVersion: 1,
        criteria: data.criteria || [],
        routingRules: data.routingRules || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localSchemes = [newScheme, ...localSchemes]
      return newScheme
    }

    const res = await apiClient.post<ApiResponse<SchemeResponse>>('/api/v1/schemes', data)
    return res.data.data
  },

  updateScheme: async (id: string, data: UpdateSchemeRequest): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const idx = localSchemes.findIndex((s) => s.id === id)
      if (idx !== -1) {
        localSchemes[idx] = {
          ...localSchemes[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        }
        return localSchemes[idx]
      }
      throw new Error('Scheme not found')
    }

    const res = await apiClient.put<ApiResponse<SchemeResponse>>(`/api/v1/schemes/${id}`, data)
    return res.data.data
  },

  getCriteria: async (id: string): Promise<CriterionDto[]> => {
    if (isDemoMode()) {
      const scheme = localSchemes.find((s) => s.id === id)
      return scheme?.criteria || []
    }

    const res = await apiClient.get<ApiResponse<CriterionDto[]>>(`/api/v1/schemes/${id}/criteria`)
    return res.data.data
  },

  updateCriteria: async (id: string, criteria: CriterionDto[]): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const idx = localSchemes.findIndex((s) => s.id === id)
      if (idx !== -1) {
        localSchemes[idx] = {
          ...localSchemes[idx],
          criteria,
          configVersion: localSchemes[idx].configVersion + 1,
          updatedAt: new Date().toISOString(),
        }
        return localSchemes[idx]
      }
      throw new Error('Scheme not found')
    }

    const res = await apiClient.put<ApiResponse<SchemeResponse>>(
      `/api/v1/schemes/${id}/criteria`,
      criteria
    )
    return res.data.data
  },

  getRoutingRules: async (id: string): Promise<RoutingRuleDto[]> => {
    if (isDemoMode()) {
      const scheme = localSchemes.find((s) => s.id === id)
      return scheme?.routingRules || []
    }

    const res = await apiClient.get<ApiResponse<RoutingRuleDto[]>>(`/api/v1/schemes/${id}/routing-rules`)
    return res.data.data
  },

  updateRoutingRules: async (id: string, rules: RoutingRuleDto[]): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const idx = localSchemes.findIndex((s) => s.id === id)
      if (idx !== -1) {
        localSchemes[idx] = {
          ...localSchemes[idx],
          routingRules: rules,
          configVersion: localSchemes[idx].configVersion + 1,
          updatedAt: new Date().toISOString(),
        }
        return localSchemes[idx]
      }
      throw new Error('Scheme not found')
    }

    const res = await apiClient.put<ApiResponse<SchemeResponse>>(
      `/api/v1/schemes/${id}/routing-rules`,
      rules
    )
    return res.data.data
  },

  activateScheme: async (id: string): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const idx = localSchemes.findIndex((s) => s.id === id)
      if (idx !== -1) {
        localSchemes[idx] = { ...localSchemes[idx], status: 'ACTIVE', updatedAt: new Date().toISOString() }
        return localSchemes[idx]
      }
      throw new Error('Scheme not found')
    }

    const res = await apiClient.post<ApiResponse<SchemeResponse>>(`/api/v1/schemes/${id}/activate`)
    return res.data.data
  },

  deactivateScheme: async (id: string): Promise<SchemeResponse> => {
    if (isDemoMode()) {
      const idx = localSchemes.findIndex((s) => s.id === id)
      if (idx !== -1) {
        localSchemes[idx] = { ...localSchemes[idx], status: 'INACTIVE', updatedAt: new Date().toISOString() }
        return localSchemes[idx]
      }
      throw new Error('Scheme not found')
    }

    const res = await apiClient.post<ApiResponse<SchemeResponse>>(`/api/v1/schemes/${id}/deactivate`)
    return res.data.data
  },
}
