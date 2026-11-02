import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { schemesApi } from '@/api/schemes'
import { applicationsApi } from '@/api/applications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Layers,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  User,
  ShieldCheck,
} from 'lucide-react'

export const BeneficiaryDashboard: React.FC = () => {
  const { beneficiaryId, currentBeneficiary } = useAuth()

  // Fetch active schemes
  const { data: schemesData, isLoading: schemesLoading } = useQuery({
    queryKey: ['beneficiary', 'active-schemes'],
    queryFn: () => schemesApi.listSchemes('ACTIVE', 0, 10),
  })

  // Fetch citizen's applications if beneficiaryId is set
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['beneficiary', 'my-applications', beneficiaryId],
    queryFn: () => applicationsApi.listApplications({ beneficiaryId, page: 0, size: 10 }),
    enabled: Boolean(beneficiaryId),
  })

  const schemes = schemesData?.content || []
  const applications = applicationsData?.content || []

  const approvedApps = applications.filter((a) => a.status === 'APPROVED')
  const totalApprovedAmount = approvedApps.reduce(
    (sum, a) => sum + (Number(a.requestedAmount) || 0),
    0
  )
  const pendingApps = applications.filter(
    (a) =>
      a.status === 'UNDER_VERIFICATION' ||
      a.status === 'SUBMITTED' ||
      a.status === 'ELIGIBILITY_REVIEW'
  )

  const isLoading = schemesLoading || (beneficiaryId ? applicationsLoading : false)

  if (isLoading) {
    return <LoadingSpinner text="Loading citizen portal overview..." />
  }

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800/80">
            Citizen Entitlement Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
            {currentBeneficiary ? `Welcome, ${currentBeneficiary.fullName}` : 'Welcome to SGDTS Citizen Portal'}
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Apply for central and state subsidy schemes, track multi-level verification milestones, and verify direct grant disbursement statuses.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/beneficiary/schemes">
              <Button variant="secondary" size="md" leftIcon={<Search className="h-4 w-4" />}>
                Browse Eligible Schemes
              </Button>
            </Link>
            <Link to="/beneficiary/applications">
              <Button
                variant="outline"
                size="md"
                className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700"
                leftIcon={<FileText className="h-4 w-4" />}
              >
                My Applications ({applications.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* If no citizen is selected */}
      {!beneficiaryId && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900">
                You are currently browsing anonymously in demo mode. Please select or register a citizen profile to submit subsidy applications.
              </p>
            </div>
            <Link to="/beneficiary/profile">
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                Setup Citizen Identity
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Open Subsidy Schemes
              </p>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {schemesData?.totalElements || schemes.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Available for immediate application</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                In Verification Queue
              </p>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {pendingApps.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Under official assessment</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Approved Grant Entitlement
              </p>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totalApprovedAmount)}
              </div>
              <p className="text-xs text-emerald-700 font-medium mt-1">
                {approvedApps.length} Sanctioned claims
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Schemes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Featured Subsidy Schemes</h2>
          <Link to="/beneficiary/schemes" className="text-xs font-semibold text-blue-600 hover:underline">
            View All ({schemes.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemes.slice(0, 3).map((s) => (
            <Card key={s.id} className="hover:border-slate-300 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active Program
                  </span>
                  <span className="text-xs text-slate-400 font-mono">v{s.configVersion}</span>
                </div>
                <CardTitle className="text-base mt-2 line-clamp-1">{s.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {s.description || 'Government direct benefit assistance scheme.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 mb-4 border border-slate-100">
                  <div className="text-slate-500">Sanctioned Grant Limit</div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {formatCurrency(s.minGrantAmount)} – {formatCurrency(s.maxGrantAmount)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/beneficiary/schemes/${s.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Scheme Details
                    </Button>
                  </Link>
                  <Link to={`/beneficiary/apply/${s.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full text-xs">
                      Apply Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Applications table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Recent Grant Applications</CardTitle>
            <CardDescription>Track status history and verification progress of submitted claims.</CardDescription>
          </div>
          <Link to="/beneficiary/applications">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Reference No.</th>
                  <th className="px-6 py-3.5">Requested Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Current Stage</th>
                  <th className="px-6 py-3.5">Submission Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      You haven't submitted any grant applications yet.
                    </td>
                  </tr>
                ) : (
                  applications.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatCurrency(app.requestedAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {app.currentVerificationStage ? app.currentVerificationStage.replace(/_/g, ' ') : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(app.submittedAt || app.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/beneficiary/applications/${app.id}/track`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Track Status <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

