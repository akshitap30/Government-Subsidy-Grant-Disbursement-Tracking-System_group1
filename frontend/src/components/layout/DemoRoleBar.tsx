import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, UserRole } from '@/context/AuthContext'
import { Shield, UserCheck, Users, ChevronDown, Check, Database, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DemoRoleBar: React.FC = () => {
  const {
    role,
    setRole,
    officerId,
    setOfficerId,
    beneficiaryId,
    isDemoDataMode,
    setIsDemoDataMode,
    backendOnline,
    checkBackendStatus,
  } = useAuth()
  const navigate = useNavigate()
  const [isOfficerMenuOpen, setIsOfficerMenuOpen] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  const roles: { id: UserRole; label: string; icon: React.ReactNode; path: string; desc: string }[] = [
    {
      id: 'ADMIN',
      label: 'Administrator',
      icon: <Shield className="h-4 w-4" />,
      path: '/admin/dashboard',
      desc: 'Governance, Schemes, Global Auditing',
    },
    {
      id: 'OFFICER',
      label: 'Verification Officer',
      icon: <UserCheck className="h-4 w-4" />,
      path: '/officer/dashboard',
      desc: 'Task Queue & Decisions',
    },
    {
      id: 'BENEFICIARY',
      label: 'Citizen Beneficiary',
      icon: <Users className="h-4 w-4" />,
      path: '/beneficiary/dashboard',
      desc: 'Scheme Portal & Applications',
    },
  ]

  const handleRoleChange = (newRole: UserRole, targetPath: string) => {
    setRole(newRole)
    navigate(targetPath)
  }

  const handleToggleDemoData = () => {
    const nextState = !isDemoDataMode
    setIsDemoDataMode(nextState)
    // Reload queries cleanly
    window.location.reload()
  }

  const handleCheckBackend = async () => {
    setIsChecking(true)
    await checkBackendStatus()
    setIsChecking(false)
  }

  const sampleOfficers = ['OFFICER-001', 'OFFICER-002', 'OFFICER-DISTRICT', 'OFFICER-FINANCE']

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white text-xs shadow-md">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Connection status & Demo Indicator */}
        <div className="flex items-center flex-wrap gap-2 text-slate-300">
          <span className="font-semibold tracking-wider uppercase text-amber-400 text-[10px] bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
            Simulated RBAC Context
          </span>

          {/* Backend Status indicator */}
          <button
            onClick={handleCheckBackend}
            title="Click to re-ping Spring Boot backend on :8080"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors hover:bg-slate-800 cursor-pointer"
          >
            {backendOnline ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="h-3 w-3" /> Live Backend Connected (8080)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-300">
                <WifiOff className="h-3 w-3" /> Spring Boot Offline
              </span>
            )}
            <RefreshCw className={cn('h-2.5 w-2.5 text-slate-400', isChecking && 'animate-spin')} />
          </button>

          {/* Explicit Demo Data Mode Toggle */}
          <button
            onClick={handleToggleDemoData}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-semibold transition-all cursor-pointer',
              isDemoDataMode
                ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            )}
            title="Toggle between live Spring Boot requests and offline identified demo data"
          >
            <Database className="h-3 w-3" />
            <span>{isDemoDataMode ? 'Demo Data Mode: ON' : 'Demo Data Mode: OFF'}</span>
          </button>
        </div>

        {/* Center / Right: Persona Tabs */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-slate-400 font-medium text-[11px]">Role:</span>
          <div className="inline-flex rounded-lg bg-slate-800/90 p-0.5 border border-slate-700/80">
            {roles.map((r) => {
              const isActive = role === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id, r.path)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all text-xs cursor-pointer',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  )}
                  title={r.desc}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </button>
              )
            })}
          </div>

          {/* If Officer, show active officer ID dropdown */}
          {role === 'OFFICER' && (
            <div className="relative inline-block">
              <button
                onClick={() => setIsOfficerMenuOpen(!isOfficerMenuOpen)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Change active officer identifier"
              >
                <span>ID: {officerId}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {isOfficerMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 text-slate-200">
                  <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-700">
                    Select Officer ID
                  </div>
                  {sampleOfficers.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setOfficerId(id)
                        setIsOfficerMenuOpen(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center justify-between font-mono text-xs cursor-pointer',
                        officerId === id && 'text-amber-400 font-semibold'
                      )}
                    >
                      {id}
                      {officerId === id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* If Beneficiary, show helper tag */}
          {role === 'BENEFICIARY' && beneficiaryId && (
            <div className="bg-slate-800 border border-slate-700 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-mono">
              Citizen: {beneficiaryId.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Prominent Demo Data Banner when active */}
      {isDemoDataMode && (
        <div className="bg-amber-600 text-slate-950 px-4 py-1.5 text-center text-[11px] font-semibold flex items-center justify-center gap-2 border-t border-amber-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            DEMO DATA ACTIVE: Operating with identified local mock dataset. All screens and workflows are fully interactive. To connect to Spring Boot at <code>http://localhost:8080</code>, turn off Demo Data Mode above.
          </span>
        </div>
      )}
    </div>
  )
}
