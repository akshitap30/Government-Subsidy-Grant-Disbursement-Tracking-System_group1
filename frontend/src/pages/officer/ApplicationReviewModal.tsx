import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { schemesApi } from '@/api/schemes'
import { beneficiariesApi } from '@/api/beneficiaries'
import { eligibilityApi } from '@/api/eligibility'
import { verificationApi } from '@/api/verification'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { TaskResponse, Decision } from '@/types/verification'
import type { CriterionResult } from '@/types/eligibility'
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  FileText,
  Sliders,
} from 'lucide-react'

export interface ApplicationReviewModalProps {
  isOpen: boolean
  onClose: () => void
  task: TaskResponse | null
  officerId: string
}

export const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  isOpen,
  onClose,
  task,
  officerId,
}) => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const [decision, setDecision] = useState<Decision>('APPROVE')
  const [comments, setComments] = useState('')

  // 1. Fetch Application
  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ['review-app', task?.applicationId],
    queryFn: () => applicationsApi.getApplication(task!.applicationId),
    enabled: Boolean(task?.applicationId && isOpen),
  })

  // 2. Fetch Scheme
  const { data: scheme } = useQuery({
    queryKey: ['review-scheme', application?.schemeId],
    queryFn: () => schemesApi.getScheme(application!.schemeId),
    enabled: Boolean(application?.schemeId && isOpen),
  })

  // 3. Fetch Beneficiary
  const { data: citizen } = useQuery({
    queryKey: ['review-citizen', application?.beneficiaryId],
    queryFn: () => beneficiariesApi.getById(application!.beneficiaryId),
    enabled: Boolean(application?.beneficiaryId && isOpen),
  })

  // 4. Fetch Eligibility Assessment
  const { data: assessment } = useQuery({
    queryKey: ['review-assessment', task?.applicationId],
    queryFn: () => eligibilityApi.getAssessment(task!.applicationId),
    enabled: Boolean(task?.applicationId && isOpen),
  })

  // Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: () =>
      verificationApi.recordDecision(task!.id, {
        decision,
        comments,
        actorId: officerId,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['officer-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-track'] })
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
      success(`Decision "${decision}" recorded for stage ${res.stage}`, 'Decision Recorded')
      onClose()
    },
    onError: (err: Error) => error(err.message, 'Decision Recording Failed'),
  })

  let criterionResults: CriterionResult[] = []
  if (assessment?.assessmentDetails) {
    try {
      criterionResults = JSON.parse(assessment.assessmentDetails)
    } catch {
      criterionResults = []
    }
  }

  const isLoading = appLoading

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <span>Stage Review: {task?.stage.replace(/_/g, ' ')}</span>
        </div>
      }
      description={`Task ID: ${task?.id || ''} | Acting Officer: ${officerId}`}
      maxWidth="4xl"
    >
      {isLoading ? (
        <LoadingSpinner text="Retrieving grant dossier..." />
      ) : (
        <div className="space-y-6">
          {/* Top Dossier Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Citizen Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-700">
                <User className="h-4 w-4 text-slate-500" />
                Citizen Applicant Details
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {citizen?.fullName || 'Registered Citizen'}
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{citizen?.address}, {citizen?.district}, {citizen?.state}</span>
              </div>
              <div className="text-slate-500 flex items-center gap-4 mt-1 font-mono text-[11px]">
                <span>Phone: {citizen?.phone}</span>
                <span>DOB: {formatDate(citizen?.dateOfBirth)}</span>
              </div>
            </div>

            {/* Application & Scheme Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold uppercase tracking-wider text-slate-700">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Grant Claim
                </span>
                <span className="font-mono text-blue-600">{application?.referenceNumber}</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">{scheme?.name}</div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200">
                <span className="text-slate-500">Requested Amount:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(application?.requestedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Task SLA Deadline:</span>
                <span className="font-semibold text-amber-700">{formatDate(task?.dueAt)}</span>
              </div>
            </div>
          </div>

          {/* Eligibility Assessment Telemetry */}
          {assessment && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  Automated Eligibility Scorecard
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={assessment.outcome} type="outcome" />
                  <span className="text-sm font-extrabold text-blue-700">
                    {Number(assessment.normalizedScore).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Criterion Breakdown */}
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg text-xs">
                <table className="w-full text-left text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="px-3 py-1.5">Criterion</th>
                      <th className="px-3 py-1.5 text-center">Result</th>
                      <th className="px-3 py-1.5 text-center">Score</th>
                      <th className="px-3 py-1.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criterionResults.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono font-medium text-slate-800">
                          {c.criterionId}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {c.passed ? (
                            <span className="text-emerald-600 font-bold">PASS</span>
                          ) : (
                            <span className="text-rose-600 font-bold">FAIL</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">
                          {c.score}/{c.maxScore}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{c.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Decision Recording Form */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                Official Verification Determination
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Select your determination for stage <span className="font-semibold text-white">{task?.stage}</span>.
              </p>
            </div>

            {/* Decision Radio Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'APPROVE', label: 'Approve Stage', icon: CheckCircle, color: 'hover:border-emerald-500' },
                { id: 'REJECT', label: 'Reject Claim', icon: XCircle, color: 'hover:border-rose-500' },
                { id: 'RETURN_FOR_CORRECTION', label: 'Return for Fix', icon: RotateCcw, color: 'hover:border-amber-500' },
                { id: 'FLAG_FOR_REVIEW', label: 'Flag / Escalate', icon: AlertTriangle, color: 'hover:border-purple-500' },
              ].map((item) => {
                const Icon = item.icon
                const isSelected = decision === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDecision(item.id as Decision)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1.5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Comments Field */}
            <Textarea
              label="Verification Findings & Officer Remarks"
              placeholder="State official basis for approval, deficiency remarks for return, or grounds for rejection..."
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-blue-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
                disabled={decisionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => decisionMutation.mutate()}
                isLoading={decisionMutation.isPending}
              >
                Submit Official Decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

