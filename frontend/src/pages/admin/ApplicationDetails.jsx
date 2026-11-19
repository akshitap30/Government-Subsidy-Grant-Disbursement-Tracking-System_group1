import React from 'react';
import {
  X,
  FileSpreadsheet,
  User,
  Landmark,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  RotateCcw,
  Building,
  CreditCard,
  MapPin,
  ExternalLink,
  Banknote,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const ApplicationDetails = ({
  application,
  onClose,
  onNavigateToEligibility,
  onNavigateToVerification,
  onNavigateToDisbursements,
  onNavigateToCompliance,
  onNavigateToUtilization,
}) => {
  if (!application) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-gov-navy-950 via-gov-navy-900 to-slate-900 text-white p-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-gov-teal-500/20 text-gov-teal-300 px-2 py-0.5 rounded border border-gov-teal-400/30">
                {application.referenceNumber}
              </span>
              <StatusBadge status={application.status} size="sm" />
            </div>
            <h3 className="text-xl font-bold text-white">{application.schemeName}</h3>
            <p className="text-xs text-slate-300">
              Submitted on{' '}
              {application.submissionDate
                ? new Date(application.submissionDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Recent'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Requested Amount</span>
              <span className="text-base font-extrabold text-gov-navy-950 mt-0.5 block">
                ₹{Number(application.requestedAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Sanctioned Amount</span>
              <span className="text-base font-extrabold text-gov-teal-800 mt-0.5 block">
                {application.sanctionedAmount > 0
                  ? `₹${Number(application.sanctionedAmount).toLocaleString('en-IN')}`
                  : 'Pending Sanction'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Current Stage</span>
              <span className="font-semibold text-slate-800 text-xs mt-1 block uppercase">
                {application.currentStage || 'Initial Review'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Beneficiary Category</span>
              <span className="font-semibold text-slate-800 text-xs mt-1 block">
                {application.category || 'GENERAL'} ({application.district || 'State'})
              </span>
            </div>
          </div>

          {/* Beneficiary Profile Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-gov-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-gov-teal-600" />
              Applicant Profile & Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Applicant Name</span>
                <span className="font-semibold text-slate-800">{application.beneficiaryName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">National ID (Aadhaar)</span>
                <span className="font-mono font-medium text-slate-800">
                  {application.nationalId || 'Verified APBS'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Annual Income</span>
                <span className="font-semibold text-slate-800">
                  ₹{Number(application.annualIncome || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Purpose & Project Scope */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Subsidy Utilization Proposal
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              {application.purpose || 'Grant assistance for sanctioned capital and equipment assets.'}
            </p>
          </div>

          {/* Verification Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gov-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gov-teal-600" />
              Statutory Multi-Stage Timeline
            </h4>
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {(application.timeline || []).map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5">
                    {step.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : step.status === 'IN_PROGRESS' ? (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : step.status === 'RETURNED' ? (
                      <RotateCcw className="w-4 h-4 text-orange-500 shrink-0" />
                    ) : step.status === 'REJECTED' ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 uppercase tracking-wide">
                        {step.stage?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">{step.date}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{step.notes}</p>
                    {step.officer && (
                      <span className="text-[10px] text-gov-teal-700 font-medium">
                        Officer: {step.officer}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Vetted */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gov-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gov-teal-600" />
              Verifiable Documentation Dossier
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(application.documents || []).map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                >
                  <span className="font-mono text-slate-700 truncate">{doc.name}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      doc.verified
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {doc.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToEligibility && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToEligibility(application);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Eligibility Assessment Report</span>
              </button>
            )}

            {onNavigateToVerification && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToVerification(application);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
              >
                <Clock className="w-4 h-4" />
                <span>Verification Workflow Desk</span>
              </button>
            )}

            {application.status === 'APPROVED' && onNavigateToDisbursements && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToDisbursements(application);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition shadow-xs"
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Staged Disbursements</span>
              </button>
            )}

            {application.status === 'APPROVED' && onNavigateToCompliance && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToCompliance(application);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold transition shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Compliance Tracking</span>
              </button>
            )}

            {application.status === 'APPROVED' && onNavigateToUtilization && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToUtilization(application);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition shadow-xs"
              >
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>Fund Utilization</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
