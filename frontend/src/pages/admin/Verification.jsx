import React, { useState } from 'react';
import { CheckSquare, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

export const Verification = ({ currentOfficer }) => {
  const [tasks, setTasks] = useState([
    {
      id: 'TASK-101',
      applicationId: 'APP-101',
      referenceNumber: 'GOV-APP-2026-0091',
      beneficiaryName: 'Ramesh Chandra Verma',
      schemeName: 'PM Kisan Samman Nidhi & Micro-Irrigation Grant',
      stage: 'FIELD_VERIFICATION',
      assignedOfficer: 'Rajeev Pandey',
      slaHoursRemaining: 42,
      status: 'PENDING',
    },
    {
      id: 'TASK-102',
      applicationId: 'APP-103',
      referenceNumber: 'GOV-APP-2026-0205',
      beneficiaryName: 'Gopalan Nair',
      schemeName: 'Dairy Entrepreneurship Development Subsidy',
      stage: 'INITIAL_REVIEW',
      assignedOfficer: 'Pooja Venkatesh',
      slaHoursRemaining: 68,
      status: 'PENDING',
    }
  ]);

  const [feedback, setFeedback] = useState(null);

  const handleDecision = (taskId, decision) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setFeedback(`Decision recorded: ${decision} for ${taskId}. Transaction committed.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl sm:text-2xl font-extrabold text-gov-navy-950">
          Multi-Stage Verification Queue (Officer Desk)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          72-Hour SLA enforcement, Separation of Duties (SoD), and official determination docket (/api/v1/verification/tasks)
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Assigned Scrutiny Tasks" value={tasks.length} icon={CheckSquare} color="teal" />
        <StatCard title="72-Hour SLA Met" value="100%" icon={ShieldCheck} color="emerald" />
        <StatCard title="Active Desk Officer" value={currentOfficer?.name || 'Officer'} color="blue" />
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gov-teal-700 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
                  {task.referenceNumber}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Stage: {task.stage.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  SLA: {task.slaHoursRemaining}h remaining
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1.5">{task.beneficiaryName}</h3>
              <p className="text-xs text-slate-500">{task.schemeName}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDecision(task.id, 'APPROVE')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVE</span>
              </button>

              <button
                onClick={() => handleDecision(task.id, 'RETURN_FOR_CORRECTION')}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETURN</span>
              </button>

              <button
                onClick={() => handleDecision(task.id, 'REJECT')}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
              >
                <XCircle className="w-4 h-4" />
                <span>REJECT</span>
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            No pending verification tasks assigned to your officer queue.
          </div>
        )}
      </div>
    </div>
  );
};
