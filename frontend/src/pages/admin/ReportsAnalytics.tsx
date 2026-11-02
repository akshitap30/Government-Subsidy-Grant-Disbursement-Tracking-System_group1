import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { schemesApi } from '@/api/schemes'
import { beneficiariesApi } from '@/api/beneficiaries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export const ReportsAnalytics: React.FC = () => {
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['reports-applications'],
    queryFn: () => applicationsApi.listApplications({ page: 0, size: 200 }),
  })

  const { data: schemesData, isLoading: schemesLoading } = useQuery({
    queryKey: ['reports-schemes'],
    queryFn: () => schemesApi.listSchemes(undefined, 0, 100),
  })

  const { data: citizensData, isLoading: citizensLoading } = useQuery({
    queryKey: ['reports-citizens'],
    queryFn: () => beneficiariesApi.listAll(0, 100),
  })

  const applications = appsData?.content || []
  const schemes = schemesData?.content || []
  const citizens = citizensData?.content || []

  // Compute metrics
  const totalVolume = applications.reduce((sum, a) => sum + (Number(a.requestedAmount) || 0), 0)
  const approvedApps = applications.filter((a) => a.status === 'APPROVED')
  const approvedVolume = approvedApps.reduce((sum, a) => sum + (Number(a.requestedAmount) || 0), 0)
  const rejectedApps = applications.filter((a) => a.status === 'REJECTED' || a.status === 'INELIGIBLE')
  const pendingApps = applications.filter(
    (a) => a.status === 'UNDER_VERIFICATION' || a.status === 'SUBMITTED' || a.status === 'ELIGIBILITY_REVIEW'
  )

  const approvalRate = applications.length > 0 ? (approvedApps.length / applications.length) * 100 : 0
  const avgGrantAmount = applications.length > 0 ? totalVolume / applications.length : 0

  // Chart data: Status breakdown
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.keys(statusCounts).map((key) => ({
    name: key.replace(/_/g, ' '),
    value: statusCounts[key],
  }))

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444', '#94a3b8']

  // CSV Export handler
  const handleExportCsv = () => {
    if (applications.length === 0) return
    const headers = ['Reference Number', 'Scheme ID', 'Beneficiary ID', 'Requested Amount', 'Status', 'Submitted At']
    const rows = applications.map((a) => [
      a.referenceNumber,
      a.schemeId,
      a.beneficiaryId,
      a.requestedAmount,
      a.status,
      a.submittedAt || a.createdAt,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `SGDTS_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  if (appsLoading || schemesLoading || citizensLoading) {
    return <LoadingSpinner text="Compiling National DBT Analytics Dossier..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reports & Macroeconomic Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Statutory auditing reports, subsidy budgetary distribution, and lifecycle performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={handlePrint}
          >
            Print Audit Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportCsv}
          >
            Export Claims CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Claims Volume
            </p>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalVolume)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{applications.length} applications logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sanctioned Sanctions
            </p>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(approvedVolume)}
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-1">
              {approvedApps.length} claims approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sanction Approval Rate
            </p>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {approvalRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {rejectedApps.length} rejected / ineligible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Grant Sanction
            </p>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(avgGrantAmount)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Per approved citizen</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Grant Application Pipeline Distribution</CardTitle>
            <CardDescription>Breakdown by current lifecycle status</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                No telemetry available
              </div>
            ) : (
              <div className="h-64 w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheme Catalog Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Scheme Financial Envelope Boundaries</CardTitle>
            <CardDescription>Authorized minimum and maximum grant caps (INR)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {schemes.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      {s.status} • v{s.configVersion}
                    </div>
                  </div>
                  <div className="text-right font-medium text-slate-700">
                    <div>Min: {formatCurrency(s.minGrantAmount)}</div>
                    <div className="font-bold text-blue-700">Max: {formatCurrency(s.maxGrantAmount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

