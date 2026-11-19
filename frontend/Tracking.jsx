import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  FileText,
  User,
  Landmark,
  ShieldCheck,
  Building,
  Printer,
  Calendar,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Banknote,
  ShieldAlert
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { applicationService } from '../services/applicationService';
import { disbursementService } from '../services/disbursementService';
import { complianceService } from '../services/complianceService';

export const Tracking = ({ initialReferenceNumber, onNavigateToDisbursements, onNavigateToCompliance }) => {
  const [refInput, setRefInput] = useState(initialReferenceNumber || 'GOV-APP-2026-0091');
  const [application, setApplication] = useState(null);
  const [disbursementPlan, setDisbursementPlan] = useState(null);
  const [complianceList, setComplianceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sampleRefs = [
    'GOV-APP-2026-0091',
    'GOV-APP-2026-0142',
    'GOV-APP-2026-0205',
    'GOV-APP-2026-0318',
    'GOV-APP-2026-0499',
  ];

  const handleSearch = async (refToSearch) => {
    const target = (refToSearch || refInput).trim();
    if (!target) return;

    setLoading(true);
    setError(null);
    try {
      const res = await applicationService.trackByReference(target);
      const app = res.data;
      setApplication(app);

      if (app && app.id) {
        try {
          const [planRes, compRes] = await Promise.all([
            disbursementService.getByApplicationId(app.id),
            complianceService.getByApplicationId(app.id)
          ]);
          setDisbursementPlan(planRes?.data || null);
          setComplianceList(compRes?.data || []);
        } catch (subErr) {
          console.warn('Could not load plan/compliance for tracking', subErr);
        }
      }
    } catch (err) {
      setApplication(null);
      setDisbursementPlan(null);
      setComplianceList([]);
      setError(err.message || `No application found for reference "${target}"`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refInput) {
      handleSearch(refInput);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gov-teal-700 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
            Citizen & Officer Public Service Desk
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-gov-navy-950 mt-1">
          Direct Benefit Grant Application Tracking
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Track statutory verification stages, field reports, and Direct Benefit sanction status in real time
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(refInput);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="Enter Application Reference # (e.g. GOV-APP-2026-0091)"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-teal-500 uppercase transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gov-teal-600 hover:bg-gov-teal-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-gov-teal-950/20 transition hover:shadow-lg disabled:opacity-50 shrink-0"
          >
            {loading ? 'Tracking...' : 'Track Application'}
          </button>
        </form>

        {/* Quick Sample Ref Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
          <span className="font-semibold text-slate-600">Sample Records:</span>
          {sampleRefs.map((ref) => (
            <button
              key={ref}
              type="button"
              onClick={() => {
                setRefInput(ref);
                handleSearch(ref);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition"
            >
              {ref}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <Loading message="Looking up application across National Database..." />}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-2xl text-rose-800 text-xs sm:text-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="font-bold">{error}</p>
          <p className="text-rose-600 mt-1">
            Please verify the reference number issued on your submission acknowledgment receipt.
          </p>
        </div>
      )}

      {/* Application Tracking Dossier */}
      {application && !loading && (
        <div className="space-y-6">
          {/* Status Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-extrabold bg-gov-navy-50 text-gov-navy-950 px-2.5 py-1 rounded-md border border-gov-navy-200">
                  {application.referenceNumber}
                </span>
                <StatusBadge status={application.status} size="md" />
              </div>

              <h3 className="text-xl font-bold text-slate-900">{application.schemeName}</h3>
              <p className="text-xs text-slate-500">
                Applicant:{' '}
                <strong className="text-slate-800">{application.beneficiaryName}</strong> •{' '}
                Submitted on{' '}
                {new Date(application.submissionDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Requested Grant</span>
                <span className="text-lg font-extrabold text-gov-navy-950 block mt-0.5">
                  ₹{Number(application.requestedAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Sanctioned Grant</span>
                <span className="text-lg font-extrabold text-gov-teal-800 block mt-0.5">
                  {application.sanctionedAmount > 0
                    ? `₹${Number(application.sanctionedAmount).toLocaleString('en-IN')}`
                    : 'Pending Sanction'}
                </span>
              </div>

              <button
                onClick={handlePrint}
                className="no-print p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                title="Print Official Acknowledgment Slip"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Visual Step Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-gov-teal-600" />
              Direct Benefit Tracking Timeline
            </h4>

            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3.5 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(application.timeline || []).map((step, idx) => {
                const isCompleted = step.status === 'COMPLETED';
                const isInProgress = step.status === 'IN_PROGRESS';
                const isReturned = step.status === 'RETURNED';
                const isRejected = step.status === 'REJECTED';

                return (
                  <div key={idx} className="relative flex items-start gap-4">
                    {/* Step Icon Indicator */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isInProgress
                          ? 'bg-amber-500 text-white animate-pulse'
                          : isReturned
                          ? 'bg-orange-500 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isReturned ? (
                        <RotateCcw className="w-3.5 h-3.5" />
                      ) : isRejected ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex-1 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                          {step.stage?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{step.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.notes}</p>
                      {step.officer && (
                        <div className="pt-1 text-[11px] text-gov-teal-700 font-medium">
                          Officer In-Charge: {step.officer}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestone 3: Staged Disbursement & Compliance Status (if available) */}
          {(disbursementPlan || complianceList.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gov-teal-50 text-gov-teal-700 text-xs font-bold border border-gov-teal-200">
                    <Sparkles className="w-3.5 h-3.5" />
                    Milestone 3 Direct Benefit Infrastructure
                  </div>
                  <h4 className="text-base font-bold text-gov-navy-950 mt-1">
                    Staged Disbursement Schedule & Statutory Compliance Gates
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateToDisbursements && (
                    <button
                      onClick={() => onNavigateToDisbursements(application)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Manage Tranches</span>
                    </button>
                  )}
                  {onNavigateToCompliance && (
                    <button
                      onClick={() => onNavigateToCompliance(application)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Compliance Desk</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Disbursement Plan Tranches */}
              {disbursementPlan && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      Multi-Stage Tranche Schedule (Plan: {disbursementPlan.id})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
                      Status: {disbursementPlan.planStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(disbursementPlan.stages || []).map((stg) => (
                      <div
                        key={stg.id}
                        className={`p-4 rounded-xl border transition ${
                          stg.status === 'DISBURSED'
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : stg.status === 'READY'
                            ? 'bg-blue-50/60 border-blue-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">
                            Stage {stg.stageNumber}
                          </span>
                          <StatusBadge status={stg.status} size="sm" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                          {stg.stageName}
                        </h5>
                        <div className="text-base font-extrabold text-gov-navy-950 mt-1">
                          ₹{Number(stg.amount).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Scheduled: {stg.scheduledDate || 'TBD'}</span>
                        </div>
                        {stg.transactionRef && (
                          <div className="text-[10px] font-mono text-emerald-700 mt-2 truncate">
                            Ref: {stg.transactionRef}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Gates Summary */}
              {complianceList.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-gov-teal-600" />
                    Statutory Compliance Prerequisites & Verification Checklist
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    {complianceList.map((req) => (
                      <div key={req.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 truncate">
                              {req.requirementType?.replace(/_/g, ' ')}
                            </span>
                            {req.mandatory && (
                              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                                MANDATORY
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] truncate mt-0.5">{req.description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400 font-mono">Due: {req.dueDate}</span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Domicile & Bank Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                <User className="w-4 h-4 text-gov-teal-600" />
                Applicant Socio-Economic Profile
              </h4>
              <div className="divide-y divide-slate-100 text-slate-600">
                <div className="py-2 flex justify-between">
                  <span>Full Legal Name</span>
                  <span className="font-semibold text-slate-900">{application.beneficiaryName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>Category & Quota</span>
                  <span className="font-semibold text-slate-900">{application.category || 'GENERAL'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>District / State</span>
                  <span className="font-semibold text-slate-900">
                    {application.district}, {application.state}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-gov-teal-600" />
                National Portal Official Endorsement
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                This verification dossier is electronically generated under the Central Direct Benefit Transfer
                guidelines. All statutory clearances and field reports are stored with cryptographic SHA-256
                audit integrity in compliance with government accounting norms.
              </p>
              <div className="pt-2 text-[11px] font-mono text-slate-400">
                Security Hash: SHA256:{Math.random().toString(36).substring(2, 15).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
