import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Send,
  Plus,
  Search,
  Filter,
  FileText,
  Upload,
  RefreshCw,
  ExternalLink,
  Flame,
  CheckCheck,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { complianceService } from '../services/complianceService';
import { applicationService } from '../services/applicationService';
import { disbursementService } from '../services/disbursementService';

export const Compliance = ({ initialApplicationId = null, initialStageId = null, currentOfficer }) => {
  const [requirements, setRequirements] = useState([]);
  const [flags, setFlags] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [applications, setApplications] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showResolveFlagModal, setShowResolveFlagModal] = useState(false);

  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    applicationId: '',
    stageId: '',
    requirementType: 'DOCUMENT_SUBMISSION',
    description: '',
    dueDate: '',
    mandatory: true,
    remarks: ''
  });

  const [submitForm, setSubmitForm] = useState({
    submittedBy: 'Citizen Beneficiary',
    proofDocumentUrl: '',
    remarks: ''
  });

  const [verifyForm, setVerifyForm] = useState({
    verifiedBy: currentOfficer?.name || 'Pooja Venkatesh (Nodal Cell)',
    decision: 'VERIFY', // 'VERIFY' | 'REJECT' | 'WAIVE'
    remarks: ''
  });

  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [reqRes, flagsRes, remRes, appsRes] = await Promise.all([
        complianceService.getAll(),
        complianceService.getNonComplianceFlags(),
        complianceService.getReminderLogs(),
        applicationService.getAll()
      ]);

      let reqs = reqRes.data || [];
      if (initialApplicationId) {
        reqs = reqs.filter((r) => r.applicationId === initialApplicationId);
      }
      if (initialStageId) {
        reqs = reqs.filter((r) => r.stageId === initialStageId);
      }

      setRequirements(reqs);
      setFlags(flagsRes.data || []);
      setReminders(remRes.data || []);
      setApplications(appsRes.data || []);

      if (initialApplicationId) {
        setCreateForm((f) => ({ ...f, applicationId: initialApplicationId }));
      }
    } catch (e) {
      console.error('Error loading compliance data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [initialApplicationId, initialStageId]);

  // Metrics
  const totalCount = requirements.length;
  const verifiedCount = requirements.filter((r) => r.status === 'VERIFIED').length;
  const overdueCount = requirements.filter((r) => r.status === 'OVERDUE').length;
  const pendingCount = requirements.filter((r) => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length;
  const openFlagsCount = flags.filter((f) => f.status === 'OPEN').length;

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const scanResult = await complianceService.triggerComplianceScan();
      setFeedbackMessage({
        type: 'success',
        text: `Compliance Scan Completed: Evaluated ${scanResult.scannedCount} requirements. ${scanResult.newOverdueCount} marked overdue, ${scanResult.newFlagsCount} new flags raised, and ${scanResult.newRemindersCount} automated reminders dispatched.`
      });
      loadAll();
    } catch (e) {
      setFeedbackMessage({ type: 'error', text: e.message });
    } finally {
      setScanning(false);
    }
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault();
    const app = applications.find((a) => a.id === createForm.applicationId);
    try {
      await complianceService.createRequirement({
        applicationId: createForm.applicationId,
        referenceNumber: app?.referenceNumber || `APP-${createForm.applicationId}`,
        beneficiaryName: app?.beneficiaryName || 'Beneficiary',
        stageId: createForm.stageId || null,
        requirementType: createForm.requirementType,
        description: createForm.description,
        dueDate: createForm.dueDate,
        mandatory: createForm.mandatory,
        remarks: createForm.remarks
      });
      setShowCreateModal(false);
      setCreateForm({
        applicationId: '',
        stageId: '',
        requirementType: 'DOCUMENT_SUBMISSION',
        description: '',
        dueDate: '',
        mandatory: true,
        remarks: ''
      });
      setFeedbackMessage({ type: 'success', text: 'Compliance condition logged successfully.' });
      loadAll();
    } catch (e) {
      setFeedbackMessage({ type: 'error', text: e.message });
    }
  };

  const handleSubmitCompliance = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      await complianceService.submitCompliance(selectedReq.id, {
        submittedBy: submitForm.submittedBy,
        proofDocumentUrl: submitForm.proofDocumentUrl || 'Uploaded_Document_GFR12A.pdf',
        remarks: submitForm.remarks
      });
      setShowSubmitModal(false);
      setFeedbackMessage({ type: 'success', text: 'Proof & compliance documents submitted for officer review.' });
      loadAll();
    } catch (e) {
      setFeedbackMessage({ type: 'error', text: e.message });
    }
  };

  const handleVerifyCompliance = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      if (verifyForm.decision === 'VERIFY') {
        await complianceService.verifyCompliance(selectedReq.id, {
          verifiedBy: currentOfficer?.name || verifyForm.verifiedBy,
          remarks: verifyForm.remarks || 'Documentation verified and cleared by officer.'
        });
        setFeedbackMessage({ type: 'success', text: 'Compliance requirement VERIFIED! Stage disbursement gate is cleared.' });
      } else if (verifyForm.decision === 'REJECT') {
        await complianceService.rejectCompliance(selectedReq.id, {
          verifiedBy: currentOfficer?.name || verifyForm.verifiedBy,
          remarks: verifyForm.remarks || 'Documentation rejected.'
        });
        setFeedbackMessage({ type: 'error', text: 'Compliance requirement marked REJECTED.' });
      } else if (verifyForm.decision === 'WAIVE') {
        await complianceService.waiveCompliance(selectedReq.id, {
          waivedBy: currentOfficer?.name || verifyForm.verifiedBy,
          remarks: verifyForm.remarks || 'Statutory waiver granted.'
        });
        setFeedbackMessage({ type: 'info', text: 'Compliance requirement WAIVED under authority provisions.' });
      }
      setShowVerifyModal(false);
      loadAll();
    } catch (e) {
      setFeedbackMessage({ type: 'error', text: e.message });
    }
  };

  const handleResolveFlag = async (e) => {
    e.preventDefault();
    if (!selectedFlag) return;
    try {
      await complianceService.resolveFlag(selectedFlag.id, {
        resolvedBy: currentOfficer?.name || 'Authorized Officer',
        resolutionNotes: resolveForm.resolutionNotes || 'Remedial proof submitted and cleared.'
      });
      setShowResolveFlagModal(false);
      setFeedbackMessage({ type: 'success', text: `Non-compliance flag ${selectedFlag.id} resolved.` });
      loadAll();
    } catch (e) {
      setFeedbackMessage({ type: 'error', text: e.message });
    }
  };

  const filteredRequirements = requirements.filter((r) => {
    const matchesTab =
      activeTab === 'ALL' ||
      (activeTab === 'OVERDUE' && r.status === 'OVERDUE') ||
      (activeTab === 'PENDING' && ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(r.status)) ||
      (activeTab === 'VERIFIED' && r.status === 'VERIFIED') ||
      (activeTab === 'REJECTED' && r.status === 'REJECTED') ||
      (activeTab === 'WAIVED' && r.status === 'WAIVED');

    const matchesType = typeFilter === 'ALL' || r.requirementType === typeFilter;

    const matchesSearch =
      (r.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.beneficiaryName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesType && matchesSearch;
  });

  if (loading) {
    return <Loading message="Loading compliance tracking & non-compliance flags..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-teal-700 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
              Milestone 3 Core Module
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">Statutory Precondition Tracking</span>
          </div>
          <h2 className="text-2xl font-bold text-gov-navy-950 mt-1">Compliance Tracking & Automation</h2>
          <p className="text-sm text-slate-600">
            Enforce mandatory disbursement gates, monitor SLA breaches, escalate non-compliance, and trigger automated multi-channel reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <RefreshCw className={`w-4 h-4 text-gov-teal-400 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning Overdue...' : 'Run Automated Audit Scan'}</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-teal-600 hover:bg-gov-teal-700 text-white text-xs font-bold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Compliance Requirement</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : feedbackMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requirements"
          value={totalCount}
          subtitle="Mandatory & statutory checks"
          icon={Layers}
          color="navy"
        />
        <StatCard
          title="Verified & Cleared"
          value={verifiedCount}
          subtitle={`${totalCount > 0 ? ((verifiedCount / totalCount) * 100).toFixed(0) : 0}% compliance cleared`}
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          title="Pending / In-Review"
          value={pendingCount}
          subtitle="Awaiting citizen or officer action"
          icon={Clock}
          color="indigo"
        />
        <StatCard
          title="Overdue Breaches"
          value={overdueCount}
          subtitle={`${openFlagsCount} active escalation flag(s)`}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* High Severity Non-Compliance Warning Banner */}
      {flags.filter((f) => f.status === 'OPEN').length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white rounded-2xl p-5 border border-rose-700/60 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
                <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Statutory Non-Compliance Alert ({openFlagsCount} Active Flags)</span>
              </div>
              <h4 className="text-base font-bold">Unresolved Grant Precondition Breaches</h4>
              <p className="text-xs text-rose-200/90 max-w-2xl leading-relaxed">
                The following applications have exceeded mandatory milestone reporting or document deadlines. Automatic disbursement freezes are currently in effect.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-200">SLA Enforcement Active</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {flags
              .filter((f) => f.status === 'OPEN')
              .map((flag) => (
                <div
                  key={flag.id}
                  className="bg-black/30 backdrop-blur-xs p-3.5 rounded-xl border border-rose-500/40 flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-300">{flag.referenceNumber}</span>
                      <StatusBadge status={flag.severity} size="sm" />
                    </div>
                    <div className="font-semibold text-white truncate">{flag.beneficiaryName}</div>
                    <p className="text-slate-300 text-[11px] leading-snug line-clamp-2">{flag.reason}</p>
                    <span className="text-[10px] text-rose-300 font-mono block">
                      Breach Duration: {flag.daysOverdue} days past due
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-rose-500/20">
                    <span className="text-[10px] text-slate-400">Flag ID: {flag.id}</span>
                    <button
                      onClick={() => {
                        setSelectedFlag(flag);
                        setResolveForm({ resolutionNotes: '' });
                        setShowResolveFlagModal(true);
                      }}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-semibold transition"
                    >
                      Resolve Flag
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Main Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gov-teal-600" />
              <span>Compliance Requirements Docket ({filteredRequirements.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Mandatory checklists required before disbursement stages can be marked READY and released.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['ALL', 'OVERDUE', 'PENDING', 'VERIFIED', 'REJECTED', 'WAIVED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'bg-gov-navy-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Secondary Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, citizen name, or requirement details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-gov-teal-500"
          >
            <option value="ALL">All Requirement Types</option>
            <option value="DOCUMENT_SUBMISSION">Document Submission</option>
            <option value="FIELD_VISIT">Field Inspection Visit</option>
            <option value="UTILIZATION_REPORT">Utilization Report</option>
            <option value="PROGRESS_REPORT">Milestone Progress Report</option>
            <option value="AUDIT_REPORT">Statutory Audit Voucher</option>
          </select>
        </div>

        {/* Requirements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Application & Beneficiary</th>
                <th className="py-3 px-3">Disbursement Stage</th>
                <th className="py-3 px-3">Type & Description</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequirements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No compliance requirements found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRequirements.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-gov-navy-950 block">
                        {req.referenceNumber}
                      </span>
                      <span className="text-slate-600 font-medium block mt-0.5">
                        {req.beneficiaryName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {req.id}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-slate-800 font-semibold block">
                        {req.stageName || 'General Requirement'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {req.mandatory ? 'Mandatory Release Gate' : 'Optional Check'}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded mb-1">
                        {req.requirementType?.replace('_', ' ')}
                      </span>
                      <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>
                      {req.proofDocumentUrl && (
                        <span className="text-[10px] text-gov-teal-700 font-mono block mt-1">
                          📄 {req.proofDocumentUrl}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`font-mono font-bold block ${
                        req.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                        {req.dueDate}
                      </span>
                      {req.submittedAt && (
                        <span className="text-[10px] text-slate-400 block">
                          Sub: {new Date(req.submittedAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={req.status} size="sm" />
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setSubmitForm({ submittedBy: req.beneficiaryName, proofDocumentUrl: '', remarks: '' });
                              setShowSubmitModal(true);
                            }}
                            className="px-2.5 py-1 bg-gov-teal-50 hover:bg-gov-teal-100 text-gov-teal-700 border border-gov-teal-200 rounded-lg text-xs font-semibold transition"
                          >
                            Submit Proof
                          </button>
                        )}

                        {['SUBMITTED', 'UNDER_REVIEW', 'OVERDUE'].includes(req.status) && (
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setVerifyForm({
                                verifiedBy: currentOfficer?.name || 'Pooja Venkatesh (Nodal Cell)',
                                decision: 'VERIFY',
                                remarks: 'Verified against portal guidelines.'
                              });
                              setShowVerifyModal(true);
                            }}
                            className="px-2.5 py-1 bg-gov-navy-900 hover:bg-gov-navy-950 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-gov-teal-400" />
                            <span>Verify Desk</span>
                          </button>
                        )}

                        {req.status === 'VERIFIED' && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Cleared</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reminder Automation Logs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              <span>Automated Compliance Reminder Logs ({reminders.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Multi-channel notifications dispatched at 7-day, 3-day, 1-day, due-date, and overdue intervals with strict deduplication suppression.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            Scheduled Hourly Engine
          </span>
        </div>

        <div className="space-y-2">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gov-navy-950">{rem.beneficiaryName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                    {rem.reminderType?.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Channel: {rem.channel || 'SMS'}</span>
                </div>
                <p className="text-slate-600 text-xs">{rem.message}</p>
              </div>

              <div className="text-right whitespace-nowrap shrink-0">
                <span className="text-[11px] text-slate-400 font-mono block">
                  {new Date(rem.sentAt).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">Delivered ✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Create Compliance Requirement */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add Compliance Requirement</h3>
                <p className="text-xs text-slate-300">Set a milestone reporting or documentary precondition</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRequirement} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Select Application *</label>
                <select
                  required
                  value={createForm.applicationId}
                  onChange={(e) => setCreateForm({ ...createForm, applicationId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                >
                  <option value="">-- Choose Application Claim --</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.referenceNumber} - {app.beneficiaryName} ({app.schemeName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Requirement Type *</label>
                  <select
                    value={createForm.requirementType}
                    onChange={(e) => setCreateForm({ ...createForm, requirementType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                  >
                    <option value="DOCUMENT_SUBMISSION">Document Submission</option>
                    <option value="FIELD_VISIT">Field Inspection Visit</option>
                    <option value="UTILIZATION_REPORT">Utilization Report</option>
                    <option value="PROGRESS_REPORT">Progress Report</option>
                    <option value="AUDIT_REPORT">Statutory Audit Report</option>
                    <option value="OTHER">Other Precondition</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Mandatory Due Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Description / Statutory Text *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Certified expenditure statement with original bills showing 70% tranche utilization."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="mandatoryCheck"
                  checked={createForm.mandatory}
                  onChange={(e) => setCreateForm({ ...createForm, mandatory: e.target.checked })}
                  className="w-4 h-4 text-gov-teal-600 rounded"
                />
                <label htmlFor="mandatoryCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Mandatory Disbursement Gate (Blocks fund release if unverified)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Beneficiary Submit Compliance */}
      {showSubmitModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Submit Compliance Proof</h3>
                <p className="text-xs text-slate-300">{selectedReq.referenceNumber}</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitCompliance} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-semibold">Requirement:</span>
                <p className="text-slate-800 text-xs mt-0.5">{selectedReq.description}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Submitted By</label>
                <input
                  type="text"
                  required
                  value={submitForm.submittedBy}
                  onChange={(e) => setSubmitForm({ ...submitForm, submittedBy: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Proof Document / Voucher Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Land_Deed_Signed_GFR12A.pdf"
                  value={submitForm.proofDocumentUrl}
                  onChange={(e) => setSubmitForm({ ...submitForm, proofDocumentUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Applicant Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes or context for reviewing officer..."
                  value={submitForm.remarks}
                  onChange={(e) => setSubmitForm({ ...submitForm, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Officer Verify Desk */}
      {showVerifyModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Officer Verification Determination</h3>
                <p className="text-xs text-slate-300">Evaluate compliance for {selectedReq.beneficiaryName}</p>
              </div>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleVerifyCompliance} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block font-semibold">Requirement & Submission:</span>
                <p className="text-slate-800 text-xs">{selectedReq.description}</p>
                {selectedReq.proofDocumentUrl && (
                  <span className="text-[11px] text-gov-teal-700 font-mono font-semibold block pt-1">
                    📄 Document: {selectedReq.proofDocumentUrl}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Officer Determination *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyForm({ ...verifyForm, decision: 'VERIFY' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      verifyForm.decision === 'VERIFY'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyForm({ ...verifyForm, decision: 'REJECT' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      verifyForm.decision === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyForm({ ...verifyForm, decision: 'WAIVE' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      verifyForm.decision === 'WAIVE'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚖️ Waive
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Reviewing Officer</label>
                <input
                  type="text"
                  required
                  value={verifyForm.verifiedBy}
                  onChange={(e) => setVerifyForm({ ...verifyForm, verifiedBy: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Officer Remarks / Audit Findings *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record formal verification or rejection remarks..."
                  value={verifyForm.remarks}
                  onChange={(e) => setVerifyForm({ ...verifyForm, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-navy-900 hover:bg-gov-navy-950 text-white rounded-xl font-bold shadow-md transition"
                >
                  Confirm Determination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Resolve Flag */}
      {showResolveFlagModal && selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Resolve Non-Compliance Flag</h3>
                <p className="text-xs text-slate-300">Flag ID: {selectedFlag.id}</p>
              </div>
              <button onClick={() => setShowResolveFlagModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleResolveFlag} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <span className="text-[11px] text-rose-700 font-bold block">Breach Details:</span>
                <p className="text-slate-800 text-xs">{selectedFlag.reason}</p>
                <span className="text-[11px] text-slate-500 block">
                  Beneficiary: {selectedFlag.beneficiaryName} ({selectedFlag.referenceNumber})
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Resolution Remarks *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain how this breach was rectified (e.g., remedial certificate submitted and accepted)..."
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ resolutionNotes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveFlagModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Resolve & Clear Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
