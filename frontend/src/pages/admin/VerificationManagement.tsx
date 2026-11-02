import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { verificationApi } from '@/api/verification'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  GitBranch,
  UserCheck,
  AlertTriangle,
  Play,
} from 'lucide-react'

export const VerificationManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const [selectedAppId, setSelectedAppId] = useState('')
  const [inputAppId, setInputAppId] = useState('')

  // Recent applications under verification
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['verification-apps'],
    queryFn: () => applicationsApi.listApplications({ status: 'UNDER_VERIFICATION', page: 0, size: 20 }),
  })

  // Full workflow for selected application
  const { data: workflow, isLoading: workflowLoading, refetch } = useQuery({
    queryKey: ['admin-workflow-inspect', selectedAppId],
    queryFn: () => verificationApi.getWorkflow(selectedAppId),
    enabled: Boolean(selectedAppId),
    retry: 1,
  })

  // Create workflow mutation if not created yet
  const createWorkflowMutation = useMutation({
    mutationFn: (appId: string) =>
      verificationApi.createWorkflow({
        applicationId: appId,
        schemeId: appId,
        eligibilityScore: 75,
        requestedAmount: 10000,
      }),
    onSuccess: () => {
      refetch()
      success('Verification workflow created and routed into task pipeline', 'Workflow Created')
    },
    onError: (err: Error) => error(err.message, 'Workflow Creation Failed'),
  })

  const applications = appsData?.content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Verification Workflow Control & Governance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Supervise multi-tier review pipelines, inspect verification SLAs, and audit separation-of-duties compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Applications selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Applications</CardTitle>
            <CardDescription className="text-xs">
              Claims currently in the verification stage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Application UUID..."
                value={inputAppId}
                onChange={(e) => setInputAppId(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAppId(inputAppId.trim())}
                className="h-8 px-2.5 text-xs"
              >
                Inspect
              </Button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {appsLoading ? (
                <LoadingSpinner size="sm" />
              ) : applications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No applications currently UNDER_VERIFICATION.
                </div>
              ) : (
                applications.map((app) => {
                  const isSelected = selectedAppId === app.id
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        setSelectedAppId(app.id)
                        setInputAppId(app.id)
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-xs text-blue-600">
                          {app.referenceNumber}
                        </span>
                        <StatusBadge status={app.status} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                        <span>{app.currentVerificationStage?.replace(/_/g, ' ') || 'Stage 1'}</span>
                        <span>{formatCurrency(app.requestedAmount)}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Workflow Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-600" />
                  Verification Workflow Pipeline
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedAppId ? `Application UUID: ${selectedAppId}` : 'Select an application from the left panel to inspect workflow.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {!selectedAppId ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Select an application to inspect its multi-stage verification tasks and SLA timeline.
              </div>
            ) : workflowLoading ? (
              <LoadingSpinner text="Retrieving workflow state..." />
            ) : !workflow ? (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  No Verification Workflow Created
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This application does not yet have an active verification workflow.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Workflow Status Overview */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Workflow Lifecycle
                      </span>
                      <div className="mt-1">
                        <StatusBadge status={workflow.status} type="task" />
                      </div>
                    </div>
                    {workflow.finalDecision && (
                      <div className="text-right">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Final Determination
                        </span>
                        <div className="mt-1">
                          <StatusBadge status={workflow.finalDecision} type="decision" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage Sequence Badges */}
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-500 block mb-1.5">
                      Workflow Routing Pathway:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {workflow.stages?.map((stage, idx) => {
                        const isDone = idx < workflow.currentStageIndex || workflow.status === 'COMPLETED'
                        const isCurrent = idx === workflow.currentStageIndex && workflow.status !== 'COMPLETED'
                        return (
                          <div
                            key={stage}
                            className={`px-3 py-1 rounded-md text-xs font-medium border ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                : isCurrent
                                ? 'bg-blue-600 border-blue-600 text-white font-bold'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            {isDone ? '✓ ' : `${idx + 1}. `}
                            {stage.replace(/_/g, ' ')}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual Tasks Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Executed Verification Tasks ({workflow.tasks?.length || 0})
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Stage</th>
                          <th className="px-4 py-2.5">Assigned Officer</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Decision</th>
                          <th className="px-4 py-2.5">Remarks</th>
                          <th className="px-4 py-2.5">Completed At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {workflow.tasks?.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {t.stage.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {t.assignedOfficerId || 'Unassigned'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={t.status} type="task" />
                            </td>
                            <td className="px-4 py-3">
                              {t.decision ? (
                                <StatusBadge status={t.decision} type="decision" />
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                              {t.comments || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {formatDate(t.completedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

