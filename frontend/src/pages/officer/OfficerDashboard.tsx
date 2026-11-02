import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { verificationApi } from '@/api/verification'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import {
  ListTodo,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  FileCheck,
} from 'lucide-react'

export const OfficerDashboard: React.FC = () => {
  const { officerId } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['officer-dashboard-tasks', officerId],
    queryFn: () => verificationApi.getPendingTasks(officerId, 0, 10),
  })

  const tasks = data?.content || []
  const totalPending = data?.totalElements || tasks.length

  if (isLoading) {
    return <LoadingSpinner text="Loading officer workflow dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Officer Hero Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-800/80">
              Field & District Review Authority
            </span>
            <span className="text-xs font-mono text-slate-400">ID: {officerId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
            Officer Verification Workspace
          </h1>
          <p className="text-slate-300 text-sm mt-2 max-w-xl leading-relaxed">
            Statutory verification workbench for validating applicant documents, citizen eligibility declarations, and recording formal approval decisions.
          </p>
        </div>

        <Link to="/officer/tasks">
          <Button
            variant="secondary"
            size="lg"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="whitespace-nowrap"
          >
            Open Task Queue ({totalPending})
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending My Review
              </p>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {totalPending}
              </div>
              <p className="text-xs text-slate-500 mt-1">Awaiting determination</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                SLA Compliance Target
              </p>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                72 Hours
              </div>
              <p className="text-xs text-emerald-700 font-medium mt-1">Automatic escalation policy</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Separation of Duties
              </p>
              <div className="text-sm font-bold text-slate-900 mt-1">
                Enforced by Rule Engine
              </div>
              <p className="text-xs text-slate-500 mt-1">Multi-officer verification</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Immediate Tasks Queue Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Priority Verification Tasks</CardTitle>
            <CardDescription>Grant claims requiring your immediate determination.</CardDescription>
          </div>
          <Link to="/officer/tasks">
            <Button variant="ghost" size="sm">
              View All ({totalPending})
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Task ID</th>
                  <th className="px-6 py-3.5">Target Application</th>
                  <th className="px-6 py-3.5">Stage</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Due SLA</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No tasks currently in your queue.
                    </td>
                  </tr>
                ) : (
                  tasks.slice(0, 5).map((task) => (
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
                      <td className="px-6 py-4 text-xs font-medium text-amber-700">
                        {formatDate(task.dueAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to="/officer/tasks">
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Review Dossier <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
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

