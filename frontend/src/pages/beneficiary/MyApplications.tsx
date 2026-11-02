import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ApplicationStatus } from '@/types/application'
import {
  FileText,
  ArrowRight,
  Ban,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'

export const MyApplications: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { beneficiaryId, currentBeneficiary } = useAuth()

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>(undefined)
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; appId: string; refNum: string }>({
    isOpen: false,
    appId: '',
    refNum: '',
  })

  // Fetch applications
  const { data, isLoading } = useQuery({
    queryKey: ['my-applications', beneficiaryId, statusFilter],
    queryFn: () =>
      applicationsApi.listApplications({
        beneficiaryId: beneficiaryId || undefined,
        status: statusFilter,
        page: 0,
        size: 50,
      }),
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.cancelApplication(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      queryClient.invalidateQueries({ queryKey: ['beneficiary'] })
      success(`Application ${res.referenceNumber} has been cancelled.`, 'Application Cancelled')
      setCancelModal({ isOpen: false, appId: '', refNum: '' })
    },
    onError: (err: Error) => error(err.message, 'Cancellation Failed'),
  })

  const applications = data?.content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Subsidy & Grant Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track claims submitted under your citizen identity and review real-time verification decisions.
          </p>
        </div>
        <Link to="/beneficiary/schemes">
          <Button variant="primary" size="sm">
            Apply for New Grant
          </Button>
        </Link>
      </div>

      {/* Citizen Persona Reminder if unselected */}
      {!beneficiaryId && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center justify-between text-xs text-amber-900">
            <span>
              Showing all demo applications because no specific citizen persona is selected.
            </span>
            <Link to="/beneficiary/profile" className="font-semibold underline">
              Select or Register Citizen Profile
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Table Card */}
      <Card>
        {/* Status Tabs */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between overflow-x-auto">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 shrink-0">
            {[
              { label: 'All Applications', value: undefined },
              { label: 'Under Verification', value: 'UNDER_VERIFICATION' as ApplicationStatus },
              { label: 'Approved', value: 'APPROVED' as ApplicationStatus },
              { label: 'Rejected / Ineligible', value: 'REJECTED' as ApplicationStatus },
              { label: 'Draft', value: 'DRAFT' as ApplicationStatus },
            ].map((tab) => {
              const isSelected = statusFilter === tab.value
              return (
                <button
                  key={tab.label}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Total Claims: <span className="font-semibold text-slate-800">{applications.length}</span>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Retrieving citizen applications..." />
          ) : applications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No applications found"
                description="You haven't submitted any grant applications matching the selected criteria."
                actionText="Browse Subsidy Schemes"
                onAction={() => window.location.assign('/beneficiary/schemes')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Reference Number</th>
                    <th className="px-6 py-3.5">Sanctioned Amount</th>
                    <th className="px-6 py-3.5">Current Status</th>
                    <th className="px-6 py-3.5">Verification Stage</th>
                    <th className="px-6 py-3.5">Submitted On</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => {
                    const isCancellable =
                      app.status === 'DRAFT' ||
                      app.status === 'SUBMITTED' ||
                      app.status === 'UNDER_VERIFICATION'

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono font-semibold text-blue-600">
                            {app.referenceNumber}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Scheme: {app.schemeId.substring(0, 8)}... (v{app.schemeConfigVersion})
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatCurrency(app.requestedAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">
                          {app.currentVerificationStage
                            ? app.currentVerificationStage.replace(/_/g, ' ')
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {formatDate(app.submittedAt || app.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/beneficiary/applications/${app.id}/track`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs">
                                Track Timeline <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>

                            {isCancellable && (
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
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, appId: '', refNum: '' })}
        onConfirm={() => cancelMutation.mutate(cancelModal.appId)}
        title="Cancel Grant Application?"
        message={`Are you sure you want to withdraw application ${cancelModal.refNum}? This action is irreversible.`}
        variant="danger"
        confirmText="Yes, Cancel Application"
        isLoading={cancelMutation.isPending}
      />
    </div>
  )
}

