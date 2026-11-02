import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { schemesApi } from '@/api/schemes'
import { eligibilityApi } from '@/api/eligibility'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PaginationControl } from '@/components/common/PaginationControl'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ApplicationStatus } from '@/types/application'
import {
  FileSpreadsheet,
  Search,
  Filter,
  ArrowRight,
  Ban,
  CheckSquare,
  Play,
  RotateCcw,
} from 'lucide-react'

export const ApplicationManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const [schemeFilter, setSchemeFilter] = useState<string>('')
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)

  // Modals
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; appId: string; refNum: string }>({
    isOpen: false,
    appId: '',
    refNum: '',
  })

  // Schemes for dropdown
  const { data: schemesData } = useQuery({
    queryKey: ['schemes-dropdown'],
    queryFn: () => schemesApi.listSchemes(undefined, 0, 100),
  })

  // Applications query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications', schemeFilter, beneficiaryFilter, statusFilter, page, pageSize],
    queryFn: () =>
      applicationsApi.listApplications({
        schemeId: schemeFilter || undefined,
        beneficiaryId: beneficiaryFilter || undefined,
        status: statusFilter ? (statusFilter as ApplicationStatus) : undefined,
        page,
        size: pageSize,
      }),
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.cancelApplication(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      success(`Application ${res.referenceNumber} was cancelled.`, 'Application Cancelled')
      setCancelModal({ isOpen: false, appId: '', refNum: '' })
    },
    onError: (err: Error) => error(err.message, 'Cancellation Failed'),
  })

  // Assess mutation
  const assessMutation = useMutation({
    mutationFn: (id: string) => eligibilityApi.assess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      success('Eligibility assessment completed', 'Assessment Run')
    },
    onError: (err: Error) => error(err.message, 'Assessment Failed'),
  })

  const applications = data?.content || []
  const schemes = schemesData?.content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Grant Application Central Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global monitoring of claims across all national subsidy schemes, verification stages, and disbursement outcomes.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <div className="p-4 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Scheme Filter */}
          <Select
            label="Filter by Scheme"
            value={schemeFilter}
            onChange={(e) => {
              setSchemeFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All Subsidy Schemes</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            label="Filter by Lifecycle Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ApplicationStatus | '')
              setPage(0)
            }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ELIGIBILITY_REVIEW">Eligibility Review</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="RETURNED_FOR_CORRECTION">Returned for Correction</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="INELIGIBLE">Ineligible</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>

          {/* Beneficiary Filter */}
          <Input
            label="Filter by Beneficiary UUID"
            placeholder="Search citizen UUID..."
            value={beneficiaryFilter}
            onChange={(e) => {
              setBeneficiaryFilter(e.target.value)
              setPage(0)
            }}
          />
        </div>

        {/* Content Table */}
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Querying national grant applications..." />
          ) : applications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileSpreadsheet className="h-8 w-8" />}
                title="No applications match query"
                description="Adjust or reset the search filters to inspect grant records."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Reference Number</th>
                    <th className="px-6 py-3.5">Scheme & Version</th>
                    <th className="px-6 py-3.5">Beneficiary ID</th>
                    <th className="px-6 py-3.5">Grant Claim</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Current Stage</th>
                    <th className="px-6 py-3.5">Submitted</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-700">
                        <div>{app.schemeId.substring(0, 8)}...</div>
                        <div className="text-slate-400">Ruleset v{app.schemeConfigVersion}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {app.beneficiaryId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/beneficiary/applications/${app.id}/track`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              Inspect <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>

                          {/* Force Run Assessment if stuck */}
                          {app.status === 'ELIGIBILITY_REVIEW' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => assessMutation.mutate(app.id)}
                              title="Run Eligibility Evaluation"
                              className="h-8 px-2 text-xs text-blue-600"
                            >
                              <Play className="h-3.5 w-3.5 mr-1" /> Evaluate
                            </Button>
                          )}

                          {app.status !== 'CANCELLED' && app.status !== 'APPROVED' && app.status !== 'REJECTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCancelModal({
                                  isOpen: true,
                                  appId: app.id,
                                  refNum: app.referenceNumber,
                                })
                              }
                              title="Cancel Application"
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && (
            <PaginationControl
              currentPage={page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, appId: '', refNum: '' })}
        onConfirm={() => cancelMutation.mutate(cancelModal.appId)}
        title="Cancel Application?"
        message={`Terminate application ${cancelModal.refNum} immediately?`}
        variant="danger"
        confirmText="Cancel Application"
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}

