import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { BeneficiaryResponse } from '@/types/beneficiary'
import { DEMO_BENEFICIARIES } from '@/lib/demoData'
import axios from 'axios'

export type UserRole = 'ADMIN' | 'OFFICER' | 'BENEFICIARY'

interface AuthContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  officerId: string
  setOfficerId: (id: string) => void
  beneficiaryId: string
  setBeneficiaryId: (id: string) => void
  currentBeneficiary: BeneficiaryResponse | null
  setCurrentBeneficiary: (b: BeneficiaryResponse | null) => void
  isDemoDataMode: boolean
  setIsDemoDataMode: (enabled: boolean) => void
  backendOnline: boolean | null
  checkBackendStatus: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY_ROLE = 'sgdts_demo_role'
const STORAGE_KEY_OFFICER = 'sgdts_demo_officer'
const STORAGE_KEY_BENEFICIARY = 'sgdts_demo_beneficiary'
const STORAGE_KEY_DEMO_DATA = 'sgdts_demo_data_mode'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEY_ROLE) as UserRole) || 'ADMIN'
  })

  const [officerId, setOfficerIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_OFFICER) || 'OFFICER-001'
  })

  const [beneficiaryId, setBeneficiaryIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_BENEFICIARY) || DEMO_BENEFICIARIES[0].id
  })

  // Default to true so user gets an immediate, fully functional interactive experience
  const [isDemoDataMode, setIsDemoDataModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DEMO_DATA)
    return saved !== null ? saved === 'true' : true
  })

  const [currentBeneficiary, setCurrentBeneficiary] = useState<BeneficiaryResponse | null>(() => DEMO_BENEFICIARIES[0])
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  const checkBackendStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await axios.get('/api/v1/schemes?page=0&size=1', { timeout: 2000 })
      const isUp = res.status === 200
      setBackendOnline(isUp)
      return isUp
    } catch {
      setBackendOnline(false)
      return false
    }
  }, [])

  useEffect(() => {
    // Only automatically probe backend if not in demo data mode
    if (!isDemoDataMode) {
      checkBackendStatus()
    }
  }, [isDemoDataMode, checkBackendStatus])

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole)
    localStorage.setItem(STORAGE_KEY_ROLE, newRole)
  }

  const setOfficerId = (id: string) => {
    setOfficerIdState(id)
    localStorage.setItem(STORAGE_KEY_OFFICER, id)
  }

  const setBeneficiaryId = (id: string) => {
    setBeneficiaryIdState(id)
    localStorage.setItem(STORAGE_KEY_BENEFICIARY, id)
  }

  const setIsDemoDataMode = (enabled: boolean) => {
    setIsDemoDataModeState(enabled)
    localStorage.setItem(STORAGE_KEY_DEMO_DATA, String(enabled))
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        officerId,
        setOfficerId,
        beneficiaryId,
        setBeneficiaryId,
        currentBeneficiary,
        setCurrentBeneficiary,
        isDemoDataMode,
        setIsDemoDataMode,
        backendOnline,
        checkBackendStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
