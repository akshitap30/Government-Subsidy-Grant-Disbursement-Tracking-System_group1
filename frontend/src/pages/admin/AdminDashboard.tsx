import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { schemesApi } from '@/api/schemes'
import { beneficiariesApi } from '@/api/beneficiaries'
import { applicationsApi } from '@/api/applications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Link } from 'react-router-dom'
import {
  Layers,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'

export const AdminDashboard: React.FC = () => {
  const { isDemoDataMode, setIsDemoDataMode, backendOnline } = useAuth()

  // Fetch real data from backend APIs
  const { data: schemesData, isLoading: schemesLoading, isError: schemesError } = useQuery({
    queryKey: ['admin', 'schemes'],
    queryFn: () => schemesApi.listSchemes(undefined, 0, 100),
  })

  const { data: beneficiariesData, isLoading: beneficiariesLoading, isError: beneficiariesError } = useQuery({
    queryKey: ['admin', 'beneficiaries'],
    queryFn: () => beneficiariesApi.listAll(0, 100),
  })

  const { data: applicationsData, isLoading: applicationsLoading, isError: applicationsError } = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: () => applicationsApi.listApplications({ page: 0, size: 100 }),
  })

  const isLoading = schemesLoading || beneficiariesLoading || applicationsLoading
  const isAnyError = schemesError || beneficiariesError || applicationsError

  // Compute metrics
  const schemes = schemesData?.content || []
  const beneficiaries = beneficiariesData?.content || []
  const applications = applicationsData?.content || []

  const activeSchemesCount = schemes.filter((s) => s.status === 'ACTIVE').length
  const totalBeneficiariesCount = beneficiariesData?.totalElements ?? beneficiaries.length
  const totalApplicationsCount = applicationsData?.totalElements ?? applications.length

  const pendingVerificationCount = applications.filter(
    (a) => a.status === 'UNDER_VERIFICATION' || a.status === 'SUBMITTED' || a.status === 'ELIGIBILITY_REVIEW'
  ).length

  const approvedApplications = applications.filter((a) => a.status === 'APPROVED')
  const totalDisbursedAmount = approvedApplications.reduce(
    (sum, a) => sum + (Number(a.requestedAmount) || 0),
    0
  )

  // Status breakdown data for Pie Chart
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.keys(statusCounts).map((status) => ({
    name: status.replace(/_/g, ' '),
    value: statusCounts[status],
  }))

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#94a3b8']

  // Monthly breakdown mock/computed for Bar Chart
  const trendData = [
    { month: 'Jun', submitted: 18, approved: 12 },
    { month: 'Jul', submitted: 24, approved: 19 },
    { month: 'Aug', submitted: 35, approved: 28 },
    { month: 'Sep', submitted: 42, approved: 34 },
    { month: 'Oct', submitted: 56, approved: 45 },
    { month: 'Nov', submitted: totalApplicationsCount || 68, approved: approvedApplications.length || 52 },
  ]

  if (isLoading) {
    return <LoadingSpinner text="Loading National DBT Dashboard telemetry..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            National DBT Administration Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time disbursement monitoring, subsidy scheme governance, and citizen entitlement tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/schemes">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="h-4 w-4" />}>
              Configure Scheme
            </Button>
          </Link>
          <Link to="/admin/reports">
            <Button variant="outline" size="sm" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
              Export Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Backend Offline / Demo Switch Banner */}
      {(isAnyError || backendOnline === false) && !isDemoDataMode && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-amber-900">
                Spring Boot Backend Offline (http://localhost:8080)
              </p>
              <p className="text-amber-800 mt-0.5">
                The frontend cannot reach port 8080. Start your backend with <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-semibold">.\mvnw.cmd spring-boot:run</code>, or switch to <strong>Demo Data Mode</strong> to explore and test all screens with local data.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsDemoDataMode(true)
              window.location.reload()
            }}
            className="whitespace-nowrap"
          >
            Enable Demo Data Mode
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Schemes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Schemes
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{activeSchemesCount}</span>
                <span className="text-xs text-slate-500">of {schemes.length} total</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready for enrollment
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Registered Beneficiaries */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Registered Citizens
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">
                  {totalBeneficiariesCount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Aadhaar-seeded profiles
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: In Verification Queue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Verification
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-amber-600">
                  {pendingVerificationCount}
                </span>
                <span className="text-xs text-slate-500">applications</span>
              </div>
              <p className="text-xs text-amber-700 font-medium mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> SLA threshold: 72 hrs
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Grants Approved */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Approved Grants
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totalDisbursedAmount)}
                </span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {approvedApplications.length} approved cases
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grant Application Submissions & Approvals</CardTitle>
            <CardDescription>
              Cumulative volume trend over current fiscal cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="submitted" name="Applications Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" name="Sanctioned Approvals" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Application Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Live application pipeline states.</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                No application telemetry available
              </div>
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2 text-[11px] text-slate-600">
                  {pieData.map((entry, idx) => (
                    <span key={entry.name} className="flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      {entry.name}: {entry.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Grant Applications</CardTitle>
            <CardDescription>Latest submissions flowing into the verification pipeline.</CardDescription>
          </div>
          <Link to="/admin/applications">
            <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
              View All Applications
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Reference No.</th>
                  <th className="px-6 py-3.5">Scheme ID</th>
                  <th className="px-6 py-3.5">Beneficiary ID</th>
                  <th className="px-6 py-3.5">Requested Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Submitted Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No applications recorded yet.
                    </td>
                  </tr>
                ) : (
                  applications.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {app.schemeId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {app.beneficiaryId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {formatCurrency(app.requestedAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(app.submittedAt || app.createdAt)}
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

