import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Layers,
  Users,
  FileSpreadsheet,
  CheckSquare,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  FileText,
  User,
  ListTodo,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sidebar: React.FC = () => {
  const { role } = useAuth()

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/schemes', label: 'Scheme Management', icon: Layers },
    { to: '/admin/beneficiaries', label: 'Beneficiary Management', icon: Users },
    { to: '/admin/applications', label: 'Application Management', icon: FileSpreadsheet },
    { to: '/admin/eligibility', label: 'Eligibility Overview', icon: CheckSquare },
    { to: '/admin/verification', label: 'Verification Control', icon: ShieldCheck },
    { to: '/admin/disbursements', label: 'Disbursement Tracking', icon: CreditCard },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/admin/settings', label: 'System Settings', icon: SettingsIcon },
  ]

  const beneficiaryLinks = [
    { to: '/beneficiary/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/beneficiary/schemes', label: 'Browse Subsidy Schemes', icon: Search },
    { to: '/beneficiary/applications', label: 'My Applications', icon: FileText },
    { to: '/beneficiary/profile', label: 'Beneficiary Profile', icon: User },
  ]

  const officerLinks = [
    { to: '/officer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/officer/tasks', label: 'Verification Queue', icon: ListTodo },
    { to: '/officer/history', label: 'Verification History', icon: History },
  ]

  const links =
    role === 'ADMIN'
      ? adminLinks
      : role === 'BENEFICIARY'
      ? beneficiaryLinks
      : officerLinks

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-6.5rem)] border-r border-slate-800">
      <div className="p-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {role === 'ADMIN'
            ? 'Administration Workspace'
            : role === 'BENEFICIARY'
            ? 'Citizen Self-Service'
            : 'Officer Portal'}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">SGDTS Platform v1.0.0</p>
        <p className="mt-0.5">Government Digital Service</p>
      </div>
    </aside>
  )
}

