import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { Landmark, CheckCircle2, AlertTriangle, Database } from 'lucide-react'

export const Topbar: React.FC = () => {
  const { role, officerId, currentBeneficiary, backendOnline, isDemoDataMode } = useAuth()

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Portal Info */}
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm ring-2 ring-slate-100">
            <Landmark className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                SGDTS
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Enterprise Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Government Subsidy & Grant Disbursement Tracking System
            </p>
          </div>
        </div>

        {/* Right Info: Live System Badge & Current Role Context */}
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          {isDemoDataMode ? (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
              <Database className="h-3.5 w-3.5 text-amber-600" />
              <span>Demo Dataset Mode</span>
            </div>
          ) : backendOnline ? (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Spring Boot Connected (v1)</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span>Backend Offline (8080)</span>
            </div>
          )}

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          {/* User badge */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
              {role === 'ADMIN' ? 'AD' : role === 'OFFICER' ? 'VO' : 'CB'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {role === 'ADMIN'
                  ? 'System Administrator'
                  : role === 'OFFICER'
                  ? `Officer (${officerId})`
                  : currentBeneficiary
                  ? currentBeneficiary.fullName
                  : 'Citizen Beneficiary'}
              </p>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                {role === 'ADMIN'
                  ? 'National DBT Directorate'
                  : role === 'OFFICER'
                  ? 'Verification Division'
                  : 'Public Citizen Portal'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
