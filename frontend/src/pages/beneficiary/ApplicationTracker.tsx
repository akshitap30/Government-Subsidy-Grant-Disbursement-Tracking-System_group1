import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { schemesApi } from '@/api/schemes'
import { eligibilityApi } from '@/api/eligibility'
import { verificationApi } from '@/api/verification'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import type { CriterionResult } from '@/types/eligibility'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  ListOrdered,
} from 'lucide-react'

export const ApplicationTracker: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  // 1. Fetch Application
  const { data: app, isLoading: appLoading } = useQuery({
    queryKey: ['application-track', id],
    queryFn: () => applicationsApi.getApplication(id!),
    enabled: Boolean(id),
  })

  // 2. Fetch Scheme
  const { data: scheme } = useQuery({
    queryKey: ['scheme-track', app?.schemeId],
    queryFn: () => schemesApi.getScheme(app!.schemeId),
    enabled: Boolean(app?.schemeId),
  })

  // 3. Fetch Eligibility Assessment
  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ['eligibility-track', id],
    queryFn: () => eligibilityApi.getAssessment(id!),
    enabled: Boolean(id && app && app.status !== 'DRAFT'),
    retry: 1,
  })

  // 4. Fetch Verification Workflow
  const { data: workflow, isLoading: workflowLoading } = useQuery({
    queryKey: ['workflow-track', id],
    queryFn: () => verificationApi.getWorkflow(id!),
    enabled: Boolean(id && app && (app.status === 'UNDER_VERIFICATION' || app.status === 'APPROVED' || app.status === 'REJECTED' || app.status === 'RETURNED_FOR_CORRECTION')),
    retry: 1,
  })

  // Optional manual submit mutation if application is in DRAFT
  const submitMutation = useMutation({
    mutationFn: () => applicationsApi.submitApplication(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-track', id] })
      queryClient.invalidateQueries({ queryKey: ['eligibility-track', id] })
      queryClient.invalidateQueries({ queryKey: ['workflow-track', id] })
      success('Application submitted for automated eligibility evaluation', 'Submitted')
    },
    onError: (err: Error) => error(err.message, 'Submission Failed'),
  })

  if (appLoading) {
    return <LoadingSpinner text="Retrieving application lifecycle telemetry..." />
  }

  if (!app) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Application Not Found</h2>
        <Link to="/beneficiary/applications">
          <Button variant="outline">Back to My Applications</Button>
        </Link>
      </div>
    )
  }

  // Parse assessment details JSON
  let criterionResults: CriterionResult[] = []
  if (assessment?.assessmentDetails) {
    try {
      criterionResults = JSON.parse(assessment.assessmentDetails)
    } catch {
      criterionResults = []
    }
  }

  // Parse statusHistory: "STATUS:ISO-TIMESTAMP"
  const historyItems = (app.statusHistory || []).map((entry, index) => {
    const colonIdx = entry.indexOf(':')
    if (colonIdx === -1) return { status: entry, time: app.createdAt }
    const st = entry.substring(0, colonIdx)
    const tm = entry.substring(colonIdx + 1)
    return { status: st, time: tm }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/beneficiary/applications"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Applications List
        </Link>
        <span className="text-xs font-mono text-slate-400">UUID: {app.id}</span>
      </div>

      {/* Primary Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                  {app.referenceNumber}
                </h1>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                Scheme: {scheme?.name || app.schemeId}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                <span>Submitted: {formatDate(app.submittedAt || app.createdAt)}</span>
                <span>•</span>
                <span>Version: v{app.schemeConfigVersion}</span>
                <span>•</span>
                <span>Beneficiary: {app.beneficiaryId.substring(0, 8)}...</span>
              </div>
            </div>

            <div className="text-left md:text-right p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Requested Grant Amount
              </span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {formatCurrency(app.requestedAmount)}
              </div>
            </div>
          </div>

          {/* If DRAFT, offer submit button */}
          {app.status === 'DRAFT' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div className="text-xs text-amber-900">
                This application is still in <strong>DRAFT</strong> mode. Submit it to initiate automated eligibility scoring.
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => submitMutation.mutate()}
                isLoading={submitMutation.isPending}
                leftIcon={<Play className="h-3.5 w-3.5" />}
              >
                Submit Application Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Status History Stepper & Verification Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Transition History (Left 1 Col) */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Audit Status Log
            </CardTitle>
            <CardDescription className="text-xs">Immutable lifecycle transitions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {historyItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No transitions logged yet.</p>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {historyItems.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-blue-600 border-2 border-white ring-1 ring-blue-300" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                        {item.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateTime(item.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Workflow Stages (Right 2 Cols) */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Multi-Stage Verification Pipeline
            </CardTitle>
            <CardDescription className="text-xs">
              Sequential review gates conditioned on score and sanction limits
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {!workflow ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                {app.status === 'DRAFT' || app.status === 'SUBMITTED' || app.status === 'ELIGIBILITY_REVIEW'
                  ? 'Verification workflow will initiate once eligibility assessment completes.'
                  : 'No active verification workflow found for this application.'}
              </div>
            ) : (
              <>
                {/* Horizontal stage badges */}
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {workflow.stages?.map((stageName, sIdx) => {
                    const isDone = sIdx < workflow.currentStageIndex || workflow.status === 'COMPLETED'
                    const isCurrent = sIdx === workflow.currentStageIndex && workflow.status !== 'COMPLETED'

                    return (
                      <div
                        key={stageName}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border ${
                          isDone
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                            : isCurrent
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                            {sIdx + 1}
                          </span>
                        )}
                        <span>{stageName.replace(/_/g, ' ')}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Tasks List */}
                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Verification Task History ({workflow.tasks?.length || 0})
                  </h4>
                  {workflow.tasks?.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {task.stage.replace(/_/g, ' ')}
                          </span>
                          <StatusBadge status={task.status} type="task" />
                          {task.decision && <StatusBadge status={task.decision} type="decision" />}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                          <span>Officer: {task.assignedOfficerId || 'Pending Assignment'}</span>
                          <span>•</span>
                          <span>Due: {formatDate(task.dueAt)}</span>
                        </div>
                        {task.comments && (
                          <div className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded">
                            "{task.comments}"
                          </div>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        {task.completedAt ? `Completed: ${formatDate(task.completedAt)}` : 'In Progress'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Automated Eligibility Assessment Dossier */}
      {assessment && (
        <Card className="border-slate-300">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Automated Eligibility Assessment Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Evaluated against Scheme ruleset v{assessment.schemeConfigVersion} on{' '}
                  {formatDateTime(assessment.assessedAt)}
                </CardDescription>
              </div>
              <div>
                <StatusBadge status={assessment.outcome} type="outcome" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* Score Bar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Normalized Eligibility Score
                </span>
                <span className="text-lg font-extrabold text-blue-700">
                  {Number(assessment.normalizedScore).toFixed(1)} / 100%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    Number(assessment.normalizedScore) >= 60
                      ? 'bg-emerald-500'
                      : Number(assessment.normalizedScore) >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, Number(assessment.normalizedScore)))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                <span>Total Score: {Number(assessment.totalScore).toFixed(1)} pts</span>
                <span>Max Possible: {Number(assessment.maxPossibleScore).toFixed(1)} pts</span>
              </div>
            </div>

            {/* Per-Criterion Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Per-Criterion Evaluation Results Breakdown
              </h4>
              {criterionResults.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No criterion breakdown data parsed.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Criterion Identifier</th>
                        <th className="px-4 py-2.5 text-center">Outcome</th>
                        <th className="px-4 py-2.5 text-center">Score Awarded</th>
                        <th className="px-4 py-2.5">Evaluation Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {criterionResults.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-medium text-slate-900">
                            {c.criterionId}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.passed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                <CheckCircle2 className="h-3 w-3" /> PASSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                <XCircle className="h-3 w-3" /> FAILED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">
                            {c.score} / {c.maxScore} pts
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {c.reason || 'Criteria condition met.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

