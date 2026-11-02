export type ProfileStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface BeneficiaryResponse {
  id: string
  fullName: string
  email: string
  phone: string
  address: string
  district: string
  state: string
  dateOfBirth: string
  profileStatus: ProfileStatus
  createdAt: string
  updatedAt: string
}

export interface RegisterBeneficiaryRequest {
  fullName: string
  email: string
  phone: string
  address: string
  district: string
  state: string
  dateOfBirth: string // YYYY-MM-DD
}

export interface UpdateBeneficiaryRequest {
  fullName?: string
  phone?: string
  address?: string
  district?: string
  state?: string
}

