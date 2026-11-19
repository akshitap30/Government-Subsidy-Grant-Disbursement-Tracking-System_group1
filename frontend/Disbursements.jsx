import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Banknote,
  Plus,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { disbursementService } from '../services/disbursementService';
import { complianceService } from '../services/complianceService';
import { applicationService } from '../services/applicationService';

export const Disbursements = ({ initialApplicationId = null, onNavigateToCompliance, onNavigateToUtilization }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvedApplications, setApprovedApplications] = useState([]);

  // Modals
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedStageForRelease, setSelectedStageForRelease] = useState(null);
  const [releaseForm, setReleaseForm] = useState({ transactionRef: '', remarks: '' });
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [stageComplianceStatus, setStageComplianceStatus] = useState({});

  // New Plan Form State
  const [newPlanForm, setNewPlanForm] = useState({
    applicationId: '',
    notes: '',
  });

  // New Stage Form State
  const [newStageForm, setNewStageForm] = useState({
    stageName: '',
    amount: '',
    scheduledDate: '',
    releaseCondition: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, appsRes] = await Promise.all([
        disbursementService.getAll(),
        applicationService.getAll()
      ]);

      const loadedPlans = plansRes.data || [];
      setPlans(loadedPlans);

      // Filter applications that are APPROVED
      const approvedApps = (appsRes.data || []).filter((a) => a.status === 'APPROVED');
      setApprovedApplications(approvedApps);

      // If initialApplicationId provided, select that plan or prompt to create
      if (initialApplicationId) {
        const matchingPlan = loadedPlans.find((p) => p.applicationId === initialApplicationId);
        if (matchingPlan) {
          setSelectedPlanId(matchingPlan.id);
        } else {
          // Open create plan modal pre-filled
          setNewPlanForm((f) => ({ ...f, applicationId: initialApplicationId }));
          setShowCreatePlanModal(true);
        }
      } else if (loadedPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(loadedPlans[0].id);
      }
    } catch (err) {
      console.error('Error loading disbursement data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialApplicationId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Load compliance status for all stages in the active plan
  useEffect(() => {
    if (!selectedPlan || !selectedPlan.stages) return;

    const checkCompliance = async () => {
      const statusMap = {};
      for (const stage of selectedPlan.stages) {
        try {
          const res = await complianceService.checkStageComplianceMet(stage.id);
          statusMap[stage.id] = res;
        } catch (e) {
          statusMap[stage.id] = { allMet: true, unfulfilled: [] };
        }
      }
      setStageComplianceStatus(statusMap);
    };

    checkCompliance();
  }, [selectedPlanId, plans]);

  // Overall calculations
  const totalSanctionedAcrossPlans = plans.reduce((acc, p) => acc + Number(p.totalSanctionedAmount || 0), 0);
  const totalDisbursedAcrossPlans = plans.reduce((acc, p) => {
    const stageSum = (p.stages || [])
      .filter((s) => s.status === 'DISBURSED')
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return acc + stageSum;
  }, 0);
  const activePlansCount = plans.filter((p) => p.planStatus === 'ACTIVE').length;
  const completedPlansCount = plans.filter((p) => p.planStatus === 'COMPLETED').length;

  // Selected plan stage metrics
  const activeStages = selectedPlan ? (selectedPlan.stages || []).filter((s) => s.status !== 'CANCELLED') : [];
  const scheduledAmount = activeStages.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const disbursedAmount = activeStages
    .filter((s) => s.status === 'DISBURSED')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const remainingToSchedule = selectedPlan
    ? Math.max(0, Number(selectedPlan.totalSanctionedAmount) - scheduledAmount)
    : 0;

  const handleActivatePlan = async (planId) => {
    try {
      await disbursementService.activatePlan(planId);
      setFeedbackMessage({ type: 'success', text: 'Disbursement plan activated successfully! Stages are now scheduled for release.' });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleHoldPlan = async (planId) => {
    try {
      await disbursementService.holdPlan(planId);
      setFeedbackMessage({ type: 'info', text: 'Plan status updated.' });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleCancelPlan = async (planId) => {
    if (!window.confirm('Are you sure you want to cancel this entire disbursement plan? All undisbursed stages will be cancelled.')) return;
    try {
      await disbursementService.cancelPlan(planId);
      setFeedbackMessage({ type: 'warning', text: 'Plan has been cancelled.' });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handlePrepareStage = async (stageId) => {
    const compCheck = stageComplianceStatus[stageId];
    if (compCheck && !compCheck.allMet) {
      setFeedbackMessage({
        type: 'error',
        text: `Cannot mark Ready: Stage has ${compCheck.unfulfilled.length} unmet mandatory compliance condition(s). Please verify compliance first.`
      });
      return;
    }

    try {
      await disbursementService.prepareStage(stageId);
      setFeedbackMessage({ type: 'success', text: 'Stage marked READY for Direct Benefit Transfer release.' });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleOpenReleaseModal = (stage) => {
    const compCheck = stageComplianceStatus[stage.id];
    if (compCheck && !compCheck.allMet) {
      setFeedbackMessage({
        type: 'error',
        text: `Statutory Gate Blocked: ${compCheck.unfulfilled.length} mandatory compliance condition(s) are not verified. You must verify compliance before fund release.`
      });
      return;
    }
    setSelectedStageForRelease(stage);
    setReleaseForm({
      transactionRef: `DBT-PFMS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks: `Released tranche to verified beneficiary account under DBT guidelines.`
    });
    setShowReleaseModal(true);
  };

  const handleExecuteRelease = async () => {
    if (!selectedStageForRelease) return;
    try {
      await disbursementService.releaseStage(selectedStageForRelease.id, {
        officerId: 'Amitabh Sen (Director Finance)',
        transactionRef: releaseForm.transactionRef,
        remarks: releaseForm.remarks
      });
      setShowReleaseModal(false);
      setFeedbackMessage({
        type: 'success',
        text: `Successfully executed DBT release of ₹${Number(selectedStageForRelease.amount).toLocaleString('en-IN')}! Funds marked DISBURSED.`
      });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    const app = approvedApplications.find((a) => a.id === newPlanForm.applicationId);
    if (!app) {
      setFeedbackMessage({ type: 'error', text: 'Please select an approved application.' });
      return;
    }

    try {
      const res = await disbursementService.createPlan({
        applicationId: app.id,
        referenceNumber: app.referenceNumber,
        beneficiaryName: app.beneficiaryName,
        beneficiaryId: app.beneficiaryId,
        schemeName: app.schemeName,
        schemeId: app.schemeId,
        totalSanctionedAmount: app.sanctionedAmount || app.requestedAmount,
        notes: newPlanForm.notes,
        createdBy: 'Central Finance Admin'
      });
      setShowCreatePlanModal(false);
      setSelectedPlanId(res.data.id);
      setFeedbackMessage({ type: 'success', text: `Created disbursement plan ${res.data.id} in DRAFT status.` });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleAddStage = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      await disbursementService.addStage(selectedPlan.id, {
        stageName: newStageForm.stageName,
        amount: Number(newStageForm.amount),
        scheduledDate: newStageForm.scheduledDate,
        releaseCondition: newStageForm.releaseCondition,
        notes: newStageForm.notes
      });
      setShowAddStageModal(false);
      setNewStageForm({ stageName: '', amount: '', scheduledDate: '', releaseCondition: '', notes: '' });
      setFeedbackMessage({ type: 'success', text: 'Tranche added to schedule successfully.' });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.planStatus === statusFilter;
    const matchesSearch =
      (p.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.beneficiaryName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.schemeName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <Loading message="Loading disbursement schedules & tranche controls..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-teal-700 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
              Milestone 3 Core Module
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">Post-Approval Financial Lifecycle</span>
          </div>
          <h2 className="text-2xl font-bold text-gov-navy-950 mt-1">Staged Disbursement Scheduling</h2>
          <p className="text-sm text-slate-600">
            Configure multi-stage release schedules, enforce statutory compliance gates, and execute DBT fund releases.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setNewPlanForm({ applicationId: approvedApplications[0]?.id || '', notes: '' });
              setShowCreatePlanModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-teal-600 hover:bg-gov-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Disbursement Plan</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sanctioned"
          value={`₹${(totalSanctionedAcrossPlans / 100000).toFixed(2)} L`}
          subtitle="Across all approved plans"
          icon={Landmark}
          color="navy"
        />
        <StatCard
          title="Total Disbursed (DBT)"
          value={`₹${(totalDisbursedAcrossPlans / 100000).toFixed(2)} L`}
          subtitle={`${((totalDisbursedAcrossPlans / (totalSanctionedAcrossPlans || 1)) * 100).toFixed(1)}% released`}
          icon={Banknote}
          color="teal"
        />
        <StatCard
          title="Active Schedules"
          value={activePlansCount}
          subtitle="Tranches in progress"
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Completed Grants"
          value={completedPlansCount}
          subtitle="100% tranches settled"
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* Main Grid: Plan Selector / Sidebar + Detailed Plan View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Plans List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gov-navy-950 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-gov-teal-600" />
              <span>Disbursement Plans ({filteredPlans.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Select to inspect</span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, beneficiary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-teal-500"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {['ALL', 'ACTIVE', 'DRAFT', 'ON_HOLD', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                    statusFilter === st
                      ? 'bg-gov-navy-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Cards List */}
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredPlans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No disbursement plans match the current filters.
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const isSelected = selectedPlan && selectedPlan.id === plan.id;
                const stages = plan.stages || [];
                const disbursedSum = stages
                  .filter((s) => s.status === 'DISBURSED')
                  .reduce((sum, s) => sum + Number(s.amount || 0), 0);
                const progressPct = plan.totalSanctionedAmount > 0
                  ? Math.min(100, Math.round((disbursedSum / Number(plan.totalSanctionedAmount)) * 100))
                  : 0;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-gov-navy-900 text-white border-gov-navy-950 shadow-md ring-2 ring-gov-teal-400/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {plan.referenceNumber}
                      </span>
                      <StatusBadge status={plan.planStatus} size="sm" />
                    </div>

                    <div className="font-semibold text-sm truncate mb-0.5">{plan.beneficiaryName}</div>
                    <div className={`text-[11px] truncate mb-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {plan.schemeName}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/40">
                      <span>Sanctioned:</span>
                      <span className="font-bold">₹{Number(plan.totalSanctionedAmount).toLocaleString('en-IN')}</span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>Disbursed {progressPct}%</span>
                        <span className="font-mono">{stages.filter(s => s.status === 'DISBURSED').length}/{stages.length} tranches</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Selected Plan Management (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPlan ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Plan Header */}
              <div className="bg-gradient-to-r from-gov-navy-950 to-slate-900 text-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-gov-teal-500/20 text-gov-teal-300 px-2 py-0.5 rounded border border-gov-teal-400/30">
                        {selectedPlan.referenceNumber}
                      </span>
                      <StatusBadge status={selectedPlan.planStatus} size="sm" />
                      <span className="text-xs text-slate-400">ID: {selectedPlan.id}</span>
                    </div>
                    <h3 className="text-xl font-bold">{selectedPlan.beneficiaryName}</h3>
                    <p className="text-xs text-slate-300">{selectedPlan.schemeName}</p>
                  </div>

                  {/* Plan Top Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPlan.planStatus === 'DRAFT' && (
                      <button
                        onClick={() => handleActivatePlan(selectedPlan.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validate & Activate Plan</span>
                      </button>
                    )}

                    {['ACTIVE', 'ON_HOLD'].includes(selectedPlan.planStatus) && (
                      <button
                        onClick={() => handleHoldPlan(selectedPlan.id)}
                        className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>{selectedPlan.planStatus === 'ON_HOLD' ? 'Resume Plan' : 'Hold Plan'}</span>
                      </button>
                    )}

                    {selectedPlan.planStatus !== 'CANCELLED' && selectedPlan.planStatus !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCancelPlan(selectedPlan.id)}
                        className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-lg border border-rose-700/50 transition flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Plan</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Plan Financial Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Sanctioned</span>
                    <span className="text-base font-extrabold text-white">
                      ₹{Number(selectedPlan.totalSanctionedAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Scheduled in Stages</span>
                    <span className="text-base font-extrabold text-gov-teal-300">
                      ₹{scheduledAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Disbursed via DBT</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      ₹{disbursedAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Unscheduled Balance</span>
                    <span className={`text-base font-extrabold ${remainingToSchedule === 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                      ₹{remainingToSchedule.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Reconciliation Alert if DRAFT and amounts don't match */}
                {selectedPlan.planStatus === 'DRAFT' && remainingToSchedule !== 0 && (
                  <div className="mt-4 p-2.5 bg-amber-500/10 border border-amber-400/30 rounded-lg flex items-center gap-2 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                    <span>
                      Reconciliation Gate: Sum of active tranches must exactly equal total sanctioned amount. Currently ₹{remainingToSchedule.toLocaleString('en-IN')} remains to be scheduled.
                    </span>
                  </div>
                )}
              </div>

              {/* Staged Tranches Section */}
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gov-teal-600" />
                      <span>Milestone Stages & Tranches ({activeStages.length})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ordered multi-tranche disbursements with automated compliance prerequisite verification.
                    </p>
                  </div>

                  {selectedPlan.planStatus !== 'COMPLETED' && selectedPlan.planStatus !== 'CANCELLED' && (
                    <button
                      onClick={() => setShowAddStageModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-gov-teal-400" />
                      <span>Add Milestone Tranche</span>
                    </button>
                  )}
                </div>

                {/* Stages Stepper / Timeline View */}
                {activeStages.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No disbursement stages configured yet.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Add milestone stages (e.g., Advance Tranche, Plinth Level, Commissioning) totaling ₹{Number(selectedPlan.totalSanctionedAmount).toLocaleString('en-IN')}.
                    </p>
                    <button
                      onClick={() => setShowAddStageModal(true)}
                      className="mt-4 px-4 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      Add First Tranche
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeStages.map((stage, idx) => {
                      const comp = stageComplianceStatus[stage.id];
                      const isComplianceMet = comp ? comp.allMet : true;
                      const unfulfilledCount = comp ? comp.unfulfilled.length : 0;

                      return (
                        <div
                          key={stage.id}
                          className={`p-5 rounded-2xl border transition ${
                            stage.status === 'DISBURSED'
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : stage.status === 'READY'
                              ? 'bg-cyan-50/40 border-cyan-300 ring-1 ring-cyan-400/30'
                              : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            {/* Tranche Header & Condition */}
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="w-6 h-6 rounded-full bg-gov-navy-900 text-white text-xs font-bold flex items-center justify-center font-mono">
                                  {stage.stageNumber || idx + 1}
                                </span>
                                <h5 className="font-bold text-gov-navy-950 text-sm">{stage.stageName}</h5>
                                <StatusBadge status={stage.status} size="sm" />
                              </div>

                              <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                                <span className="font-semibold text-slate-700 block">Release Precondition:</span>
                                <p className="italic text-slate-600">{stage.releaseCondition}</p>
                              </div>

                              {/* Compliance Gateway Status Tag */}
                              <div className="flex items-center gap-2 pt-1">
                                {isComplianceMet ? (
                                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-md border border-emerald-300">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Prerequisite Compliance Cleared</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-md border border-rose-300">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>{unfulfilledCount} Mandatory Compliance Item(s) Pending</span>
                                  </div>
                                )}

                                {onNavigateToCompliance && (
                                  <button
                                    onClick={() => onNavigateToCompliance(selectedPlan.applicationId, stage.id)}
                                    className="text-[11px] text-gov-teal-700 hover:text-gov-teal-800 font-semibold underline flex items-center gap-1"
                                  >
                                    <span>Inspect Checklist</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Tranche Financials & Action Buttons */}
                            <div className="flex flex-col items-start md:items-end justify-between gap-3 min-w-[200px]">
                              <div className="text-left md:text-right">
                                <span className="text-[11px] text-slate-500 block">Tranche Amount</span>
                                <span className="text-xl font-extrabold text-gov-navy-950">
                                  ₹{Number(stage.amount).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                                  Scheduled: {stage.scheduledDate || 'Not specified'}
                                </span>
                              </div>

                              {/* Action Buttons for Stage */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {stage.status === 'SCHEDULED' && selectedPlan.planStatus === 'ACTIVE' && (
                                  <button
                                    onClick={() => handlePrepareStage(stage.id)}
                                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Validate & Mark Ready</span>
                                  </button>
                                )}

                                {stage.status === 'READY' && (
                                  <button
                                    onClick={() => handleOpenReleaseModal(stage)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-1.5 animate-pulse"
                                  >
                                    <Banknote className="w-3.5 h-3.5" />
                                    <span>Release Funds (DBT)</span>
                                  </button>
                                )}

                                {stage.status === 'DISBURSED' && (
                                  <div className="text-right">
                                    <span className="text-[10px] text-emerald-700 font-mono block">
                                      TX: {stage.transactionRef || 'DBT-PAID'}
                                    </span>
                                    {onNavigateToUtilization && (
                                      <button
                                        onClick={() => onNavigateToUtilization(selectedPlan.applicationId, stage.id)}
                                        className="mt-1 text-[11px] text-gov-navy-900 bg-slate-100 hover:bg-slate-200 font-semibold px-2.5 py-1 rounded-md border border-slate-300 transition flex items-center gap-1"
                                      >
                                        <span>Track Fund Utilization</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              Select or create a disbursement plan to manage tranches.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: New Disbursement Plan */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Create Staged Disbursement Plan</h3>
                <p className="text-xs text-slate-300">Initiate a post-approval tranche disbursement schedule</p>
              </div>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Select Approved Application *</label>
                <select
                  required
                  value={newPlanForm.applicationId}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, applicationId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-1 focus:ring-gov-teal-500"
                >
                  <option value="">-- Choose an approved grant claim --</option>
                  {approvedApplications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.referenceNumber} - {app.beneficiaryName} (₹{Number(app.sanctionedAmount || app.requestedAmount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 block">
                  Only claims that have completed the 5-Stage Verification Desk with APPROVED status can receive disbursement plans.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Plan Administrative Notes / Sanction Remarks</label>
                <textarea
                  rows={3}
                  value={newPlanForm.notes}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, notes: e.target.value })}
                  placeholder="e.g. Sanctioned pursuant to State Agriculture Welfare Gazette Notification #44..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Create Plan (Draft)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Stage / Tranche */}
      {showAddStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add Milestone Tranche</h3>
                <p className="text-xs text-slate-300">
                  Plan for {selectedPlan?.beneficiaryName} (Remaining cap: ₹{remainingToSchedule.toLocaleString('en-IN')})
                </p>
              </div>
              <button
                onClick={() => setShowAddStageModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStage} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Stage / Tranche Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tranche 2: Roof Casting & Plumbing"
                  value={newStageForm.stageName}
                  onChange={(e) => setNewStageForm({ ...newStageForm, stageName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={remainingToSchedule}
                    placeholder={`Max ₹${remainingToSchedule}`}
                    value={newStageForm.amount}
                    onChange={(e) => setNewStageForm({ ...newStageForm, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Scheduled Release Date *</label>
                  <input
                    type="date"
                    required
                    value={newStageForm.scheduledDate}
                    onChange={(e) => setNewStageForm({ ...newStageForm, scheduledDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Release Precondition Statement *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Physical geotagged inspection of plinth level and 70% voucher utilization certificate."
                  value={newStageForm.releaseCondition}
                  onChange={(e) => setNewStageForm({ ...newStageForm, releaseCondition: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Administrative Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Depute District Field Inspector for site visit"
                  value={newStageForm.notes}
                  onChange={(e) => setNewStageForm({ ...newStageForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStageModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-navy-900 hover:bg-gov-navy-950 text-white rounded-xl font-bold shadow-md transition"
                >
                  Add Stage to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Execute DBT Fund Release */}
      {showReleaseModal && selectedStageForRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 font-bold uppercase tracking-wider mb-1">
                  <Banknote className="w-4 h-4" />
                  <span>Execute Direct Benefit Transfer (DBT)</span>
                </div>
                <h3 className="font-bold text-base">{selectedStageForRelease.stageName}</h3>
              </div>
              <button
                onClick={() => setShowReleaseModal(false)}
                className="text-emerald-200 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Beneficiary:</span>
                  <span className="font-bold text-gov-navy-950">{selectedPlan.beneficiaryName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Disbursement Tranche:</span>
                  <span className="font-extrabold text-emerald-800 text-base">
                    ₹{Number(selectedStageForRelease.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Routing Rail:</span>
                  <span className="font-mono text-slate-800 font-semibold">NPCI / PFMS Direct Benefit Gateway</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">PFMS / Bank Payment Reference Number *</label>
                <input
                  type="text"
                  required
                  value={releaseForm.transactionRef}
                  onChange={(e) => setReleaseForm({ ...releaseForm, transactionRef: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Finance Sign-off Remarks</label>
                <input
                  type="text"
                  value={releaseForm.remarks}
                  onChange={(e) => setReleaseForm({ ...releaseForm, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px] leading-relaxed">
                ℹ️ <strong>System Automation:</strong> Releasing this tranche automatically creates an initial Post-Disbursement Fund Utilization record and notifies the citizen beneficiary to track expenditure.
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReleaseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRelease}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Authorize & Disburse Funds</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
