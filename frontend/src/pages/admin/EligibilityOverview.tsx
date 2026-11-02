import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { eligibilityApi } from '@/api/eligibility'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime, formatDate, formatCurrency } from '@/lib/utils'
import type { CriterionResult } from '@/types/eligibility'
import {
  CheckSquare,
  Search,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

export const EligibilityOverview: React.FC = () => {
  const { success, error } = useToast()
  const [searchAppId, setSearchAppId] = useState('')
  const [activeAppId, setActiveAppId] = useState('')

  // Fetch applications list to easily click and inspect
  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['eligibility-apps-list'],
    queryFn: () => applicationsApi.listApplications({ page: 0, size: 20 }),
  })

  // Fetch single assessment
  const { data: assessment, isLoading: assessmentLoading, refetch } = useQuery({
    queryKey: ['eligibility-detail', activeAppId],
    queryFn: () => eligibilityApi.getAssessment(activeAppId),
    enabled: Boolean(activeAppId),
    retry: 1,
  })

  // Manual Trigger Assessment mutation
  const assessMutation = useMutation({
    mutationFn: (id: string) => eligibilityApi.assess(id),
    onSuccess: () => {
      refetch()
      success('Eligibility engine successfully assessed application!', 'Evaluation Complete')
    },
    onError: (err: Error) => error(err.message, 'Evaluation Failed'),
  })

  let criterionResults: CriterionResult[] = []
  if (assessment?.assessmentDetails) {
    try {
      criterionResults = JSON.parse(assessment.assessmentDetails)
    } catch {
      criterionResults = []
    }
  }

  const applications = applicationsData?.content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Automated Eligibility Scoring Engine
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect deterministic rule-based evaluation matrices, weighted scores, and statutory disqualification reasons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Applications selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Application to Inspect</CardTitle>
            <CardDescription className="text-xs">
              Recent applications submitted for eligibility evaluation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Paste Application UUID..."
                value={searchAppId}
                onChange={(e) => setSearchAppId(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveAppId(searchAppId.trim())}
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
                  No applications recorded.
                </div>
              ) : (
                applications.map((app) => {
                  const isSelected = activeAppId === app.id
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        setActiveAppId(app.id)
                        setSearchAppId(app.id)
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
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{formatCurrency(app.requestedAmount)}</span>
                        <span>{formatDate(app.submittedAt || app.createdAt)}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Assessment Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  Scoring Engine Dossier
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeAppId ? `Target Application: ${activeAppId}` : 'Select an application on the left to review its eligibility scorecard.'}
                </CardDescription>
              </div>
              {activeAppId && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => assessMutation.mutate(activeAppId)}
                  isLoading={assessMutation.isPending}
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                  className="text-xs"
                >
                  Run Eligibility Assessment
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {!activeAppId ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Choose an application to view score breakdown and rule verification details.
              </div>
            ) : assessmentLoading ? (
              <LoadingSpinner text="Evaluating scoring parameters..." />
            ) : !assessment ? (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  No Eligibility Assessment Recorded Yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This application has not been evaluated by the engine. Click "Run Eligibility Assessment" to execute statutory checks.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => assessMutation.mutate(activeAppId)}
                  isLoading={assessMutation.isPending}
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                >
                  Evaluate Now
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score gauge & outcome */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Official Decision Outcome
                      </span>
                      <div className="mt-1">
                        <StatusBadge status={assessment.outcome} type="outcome" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold uppercase text-slate-500">
                        Normalized Score
                      </span>
                      <div className="text-2xl font-extrabold text-blue-700 mt-0.5">
                        {Number(assessment.normalizedScore).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress meter */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        assessment.outcome === 'ELIGIBLE' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, Number(assessment.normalizedScore)))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Points Scored: {assessment.totalScore}</span>
                    <span>Max Possible: {assessment.maxPossibleScore}</span>
                    <span>Ruleset: v{assessment.schemeConfigVersion}</span>
                  </div>
                </div>

                {/* Per-Criterion Results Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Criterion Level Evaluation Breakdown
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Criterion Identifier</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                          <th className="px-4 py-2.5 text-center">Points</th>
                          <th className="px-4 py-2.5">Engine Remark</th>
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
                                  <CheckCircle2 className="h-3 w-3" /> PASS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                  <XCircle className="h-3 w-3" /> FAIL
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">
                              {c.score} / {c.maxScore}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {c.reason || 'Satisfies scheme rule.'}
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

