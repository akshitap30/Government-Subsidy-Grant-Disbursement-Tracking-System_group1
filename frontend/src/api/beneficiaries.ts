import { apiClient } from './client'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type {
  BeneficiaryResponse,
  RegisterBeneficiaryRequest,
  UpdateBeneficiaryRequest,
} from '@/types/beneficiary'
import { DEMO_BENEFICIARIES } from '@/lib/demoData'

function isDemoMode(): boolean {
  const saved = localStorage.getItem('sgdts_demo_data_mode')
  return saved !== null ? saved === 'true' : true
}

let localBeneficiaries = [...DEMO_BENEFICIARIES]

export const beneficiariesApi = {
  register: async (data: RegisterBeneficiaryRequest): Promise<BeneficiaryResponse> => {
    if (isDemoMode()) {
      const newBeneficiary: BeneficiaryResponse = {
        id: `demo-cit-${Date.now()}`,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        district: data.district,
        state: data.state,
        dateOfBirth: data.dateOfBirth,
        profileStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localBeneficiaries = [newBeneficiary, ...localBeneficiaries]
      return newBeneficiary
    }

    const res = await apiClient.post<ApiResponse<BeneficiaryResponse>>(
      '/api/v1/beneficiaries',
      data
    )
    return res.data.data
  },

  getById: async (id: string): Promise<BeneficiaryResponse> => {
    if (isDemoMode()) {
      const found = localBeneficiaries.find((b) => b.id === id)
      if (found) return found
      return localBeneficiaries[0]
    }

    const res = await apiClient.get<ApiResponse<BeneficiaryResponse>>(
      `/api/v1/beneficiaries/${id}`
    )
    return res.data.data
  },

  checkExists: async (id: string): Promise<boolean> => {
    if (isDemoMode()) {
      return localBeneficiaries.some((b) => b.id === id)
    }

    const res = await apiClient.get<ApiResponse<boolean>>(
      `/api/v1/beneficiaries/${id}/exists`
    )
    return res.data.data
  },

  listAll: async (page = 0, size = 20): Promise<PagedResponse<BeneficiaryResponse>> => {
    if (isDemoMode()) {
      return {
        content: localBeneficiaries.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: localBeneficiaries.length,
        totalPages: Math.ceil(localBeneficiaries.length / size),
      }
    }

    const res = await apiClient.get<ApiResponse<PagedResponse<BeneficiaryResponse>>>(
      '/api/v1/beneficiaries',
      { params: { page, size } }
    )
    return res.data.data
  },

  update: async (id: string, data: UpdateBeneficiaryRequest): Promise<BeneficiaryResponse> => {
    if (isDemoMode()) {
      const idx = localBeneficiaries.findIndex((b) => b.id === id)
      if (idx !== -1) {
        localBeneficiaries[idx] = {
          ...localBeneficiaries[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        }
        return localBeneficiaries[idx]
      }
      throw new Error('Beneficiary not found')
    }

    const res = await apiClient.put<ApiResponse<BeneficiaryResponse>>(
      `/api/v1/beneficiaries/${id}`,
      data
    )
    return res.data.data
  },
}
