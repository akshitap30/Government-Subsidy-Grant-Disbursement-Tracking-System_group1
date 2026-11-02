import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { verificationApi } from '@/api/verification'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PaginationControl } from '@/components/common/PaginationControl'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { ApplicationReviewModal } from './ApplicationReviewModal'
import type { TaskResponse } from '@/types/verification'
import {
  ListTodo,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  UserPlus,
} from 'lucide-react'

export const TaskQueue: React.FC = () => {
  const queryClient = useQueryClient()
  const { officerId, setOfficerId } = useAuth()
  const { success, error } = useToast()

  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskResponse | null>(null)
  const [reassignModal, setReassignModal] = useState<{ isOpen: boolean; task: TaskResponse | null; newOfficerId: string }>({
    isOpen: false,
    task: null,
    newOfficerId: '',
  })

  // Fetch pending tasks for active officer
  const { data, isLoading } = useQuery({
    queryKey: ['officer-tasks', officerId, page, pageSize],
    queryFn: () => verificationApi.getPendingTasks(officerId, page, pageSize),
  })

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: ({ taskId, newId }: { taskId: string; newId: string }) =>
      verificationApi.reassignTask(taskId, newId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['officer-tasks'] })
      success(`Task successfully reassigned to ${res.assignedOfficerId}`, 'Task Reassigned')
      setReassignModal({ isOpen: false, task: null, newOfficerId: '' })
    },
    onError: (err: Error) => error(err.message, 'Reassignment Failed'),
  })

  const tasks = data?.content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Verification Task Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Assigned verification workflows requiring statutory review and officer determination.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Assigned Officer ID:</span>
          <span className="px-2.5 py-1 rounded bg-slate-900 text-amber-400 font-mono text-xs font-semibold">
            {officerId}
          </span>
        </div>
      </div>

      {/* Main Task Table Card */}
      <Card>
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Pending Docket Items ({data?.totalElements || tasks.length})
            </span>
          </div>
          <div className="text-xs text-slate-500">
            SLA Standard: <span className="font-semibold text-slate-800">72 Hours</span>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading assigned tasks..." />
          ) : tasks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
                title="All caught up!"
                description={`No pending verification tasks currently assigned to officer "${officerId}". Check other officer queues using the top role bar.`}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Task ID</th>
                    <th className="px-6 py-3.5">Application ID</th>
                    <th className="px-6 py-3.5">Verification Stage</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Due SLA Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {task.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        {task.applicationId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {task.stage.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={task.status} type="task" />
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-amber-700 flex items-center gap-1.5 pt-5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDate(task.dueAt)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedTaskForReview(task)}
                            className="h-8 text-xs"
                          >
                            Review & Decide <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReassignModal({
                                isOpen: true,
                                task,
                                newOfficerId: 'OFFICER-002',
                              })
                            }
                            title="Reassign Task"
                            className="h-8 px-2 text-xs"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Reassign
                          </Button>
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

      {/* Review Modal */}
      <ApplicationReviewModal
        isOpen={Boolean(selectedTaskForReview)}
        onClose={() => setSelectedTaskForReview(null)}
        task={selectedTaskForReview}
        officerId={officerId}
      />

      {/* Reassign Modal */}
      <Modal
        isOpen={reassignModal.isOpen}
        onClose={() => setReassignModal({ isOpen: false, task: null, newOfficerId: '' })}
        title="Reassign Verification Task"
        description="Transfer this verification task to another qualified review officer."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Target Officer ID"
            placeholder="e.g. OFFICER-002 or OFFICER-FINANCE"
            value={reassignModal.newOfficerId}
            onChange={(e) =>
              setReassignModal((prev) => ({ ...prev, newOfficerId: e.target.value }))
            }
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReassignModal({ isOpen: false, task: null, newOfficerId: '' })}
              disabled={reassignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (reassignModal.task && reassignModal.newOfficerId) {
                  reassignMutation.mutate({
                    taskId: reassignModal.task.id,
                    newId: reassignModal.newOfficerId,
                  })
                }
              }}
              isLoading={reassignMutation.isPending}
            >
              Confirm Transfer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

