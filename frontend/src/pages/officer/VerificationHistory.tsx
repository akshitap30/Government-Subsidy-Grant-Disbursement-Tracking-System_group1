import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { verificationApi } from '@/api/verification'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, formatDateTime } from '@/lib/utils'
import { History, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react'

export const VerificationHistory: React.FC = () => {
  const { officerId } = useAuth()

  // Fetch officer tasks
  const { data, isLoading } = useQuery({
    queryKey: ['officer-history', officerId],
    queryFn: () => verificationApi.getPendingTasks(officerId, 0, 50),
  })

  const tasks = data?.content || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Officer Verification Decision Log
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Historical record of verification findings, audit remarks, and statutory decisions rendered by officer <span className="font-mono font-semibold text-slate-700">{officerId}</span>.
        </p>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Audit Decision Log
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Officer ID: {officerId}
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Retrieving decision log..." />
          ) : tasks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<History className="h-8 w-8 text-slate-400" />}
                title="No completed decisions recorded"
                description={`No verification determinations currently logged under officer identity "${officerId}".`}
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
                    <th className="px-6 py-3.5">Recorded Decision</th>
                    <th className="px-6 py-3.5">Findings / Remarks</th>
                    <th className="px-6 py-3.5">Assigned Date</th>
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
                        {task.decision ? (
                          <StatusBadge status={task.decision} type="decision" />
                        ) : (
                          <StatusBadge status={task.status} type="task" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                        {task.comments || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDateTime(task.assignedAt || task.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

