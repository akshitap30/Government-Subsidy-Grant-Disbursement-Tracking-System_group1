import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  MapPin,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { utilizationService } from '../services/utilizationService';
import { analyticsService } from '../services/analyticsService';
import { disbursementService } from '../services/disbursementService';
import { complianceService } from '../services/complianceService';

const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981'];

export const Analytics = ({ initialApplicationId = null, initialStageId = null, currentOfficer }) => {
  const [loading, setLoading] = useState(true);
  const [utilizations, setUtilizations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [regionalData, setRegionalData] = useState([]);
  const [schemeData, setSchemeData] = useState([]);
  const [disbursementKpis, setDisbursementKpis] = useState(null);
  const [selectedState, setSelectedState] = useState('ALL');
  const [disbursementPlans, setDisbursementPlans] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedUtil, setSelectedUtil] = useState(null);

  // Record Form
  const [recordForm, setRecordForm] = useState({
    applicationId: '',
    disbursementStageId: '',
    amountDisbursed: '',
    amountUtilized: '',
    category: 'RAW_MATERIALS',
    invoiceNumber: '',
    description: '',
    utilizationDate: new Date().toISOString().split('T')[0]
  });

  const [verifyForm, setVerifyForm] = useState({
    status: 'VERIFIED',
    remarks: 'Vouchers and physical bills verified against public finance rules.'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [utilRes, sumRes, regRes, schRes, disbRes, plansRes] = await Promise.all([
        utilizationService.getAll(),
        utilizationService.getSummary(),
        analyticsService.getRegionalAnalytics({ state: selectedState }),
        analyticsService.getSchemeAnalytics(),
        analyticsService.getDisbursementAnalytics(),
        disbursementService.getAll()
      ]);

      setUtilizations(utilRes.data || []);
      setSummary(sumRes.data || null);
      setRegionalData(regRes.data || []);
      setSchemeData(schRes.data || []);
      setDisbursementKpis(disbRes.data || null);
      setDisbursementPlans(plansRes.data || []);

      if (initialApplicationId) {
        setRecordForm((f) => ({
          ...f,
          applicationId: initialApplicationId,
          disbursementStageId: initialStageId || ''
        }));
      }
    } catch (e) {
      console.error('Error loading analytics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedState, initialApplicationId, initialStageId]);

  // Chart data: Disbursed vs Utilized by district/state
  const regionalChartData = regionalData.map((d) => ({
    name: `${d.district} (${d.state.slice(0, 2).toUpperCase()})`,
    Disbursed: Math.round(Number(d.disbursedAmount || 0) / 100000), // In Lakhs
    Utilized: Math.round(Number(d.utilizedAmount || 0) / 100000),
    rate: d.utilizationRate
  }));

  // Category breakdown for pie chart
  const categoryTotals = utilizations.reduce((acc, u) => {
    const cat = u.category || 'OTHER';
    acc[cat] = (acc[cat] || 0) + Number(u.amountUtilized || 0);
    return acc;
  }, {});

  const categoryPieData = Object.keys(categoryTotals).map((cat) => ({
    name: cat.replace('_', ' '),
    value: categoryTotals[cat]
  }));

  // Disbursed stages from all plans for dropdown selection
  const disbursedStagesList = [];
  disbursementPlans.forEach((p) => {
    (p.stages || []).forEach((s) => {
      if (s.status === 'DISBURSED') {
        disbursedStagesList.push({
          planId: p.id,
          applicationId: p.applicationId,
          referenceNumber: p.referenceNumber,
          beneficiaryName: p.beneficiaryName,
          stageId: s.id,
          stageName: s.stageName,
          amount: s.amount
        });
      }
    });
  });

  const handleStageSelectForRecord = (e) => {
    const stageId = e.target.value;
    const stageObj = disbursedStagesList.find((s) => s.stageId === stageId);
    if (stageObj) {
      setRecordForm({
        ...recordForm,
        disbursementStageId: stageObj.stageId,
        applicationId: stageObj.applicationId,
        amountDisbursed: stageObj.amount,
        amountUtilized: ''
      });
    } else {
      setRecordForm({
        ...recordForm,
        disbursementStageId: '',
        applicationId: '',
        amountDisbursed: '',
        amountUtilized: ''
      });
    }
  };

  const handleRecordUtilization = async (e) => {
    e.preventDefault();
    const disbursed = Number(recordForm.amountDisbursed || 0);
    const utilized = Number(recordForm.amountUtilized || 0);

    if (utilized > disbursed) {
      setFeedbackMessage({
        type: 'error',
        text: `Validation Failed: Utilized amount (₹${utilized.toLocaleString('en-IN')}) cannot exceed disbursed amount (₹${disbursed.toLocaleString('en-IN')}).`
      });
      return;
    }

    try {
      const stageObj = disbursedStagesList.find((s) => s.stageId === recordForm.disbursementStageId);
      await utilizationService.recordUtilization({
        applicationId: recordForm.applicationId,
        referenceNumber: stageObj?.referenceNumber || `APP-${recordForm.applicationId}`,
        beneficiaryName: stageObj?.beneficiaryName || 'Beneficiary',
        disbursementStageId: recordForm.disbursementStageId,
        stageName: stageObj?.stageName || 'Tranche Release',
        amountDisbursed: disbursed,
        amountUtilized: utilized,
        category: recordForm.category,
        invoiceNumber: recordForm.invoiceNumber,
        description: recordForm.description,
        utilizationDate: recordForm.utilizationDate,
        recordedBy: currentOfficer?.name || 'Authorized Submitter'
      });
      setShowRecordModal(false);
      setRecordForm({
        applicationId: '',
        disbursementStageId: '',
        amountDisbursed: '',
        amountUtilized: '',
        category: 'RAW_MATERIALS',
        invoiceNumber: '',
        description: '',
        utilizationDate: new Date().toISOString().split('T')[0]
      });
      setFeedbackMessage({ type: 'success', text: 'Fund utilization voucher recorded and queued for audit.' });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyUtilization = async (e) => {
    e.preventDefault();
    if (!selectedUtil) return;
    try {
      await utilizationService.verifyUtilization(selectedUtil.id, {
        verifiedBy: currentOfficer?.name || 'Amitabh Sen (Director Finance)',
        status: verifyForm.status,
        remarks: verifyForm.remarks
      });
      setShowVerifyModal(false);
      setFeedbackMessage({
        type: verifyForm.status === 'VERIFIED' ? 'success' : 'error',
        text: `Utilization record ${selectedUtil.id} marked as ${verifyForm.status}.`
      });
      loadData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  // CSV Exporters
  const exportDisbursementLedgerCsv = () => {
    const headers = [
      'Plan ID',
      'Application Reference',
      'Beneficiary',
      'Scheme',
      'Sanctioned Amount (INR)',
      'Plan Status',
      'Stage Count',
      'Disbursed Total (INR)'
    ];
    const rows = disbursementPlans.map((p) => [
      p.id,
      p.referenceNumber,
      p.beneficiaryName,
      p.schemeName,
      p.totalSanctionedAmount,
      p.planStatus,
      p.stages?.length || 0,
      (p.stages || [])
        .filter((s) => s.status === 'DISBURSED')
        .reduce((sum, s) => sum + Number(s.amount || 0), 0)
    ]);
    analyticsService.exportToCsv('SGDTS_Disbursement_Ledger_2026.csv', headers, rows);
  };

  const exportRegionalReportCsv = () => {
    const headers = [
      'State',
      'District',
      'Total Applications',
      'Approved Grants',
      'Sanctioned Outlay (INR)',
      'Disbursed via DBT (INR)',
      'Utilized (INR)',
      'Utilization Rate (%)',
      'Lead Scheme'
    ];
    const rows = regionalData.map((d) => [
      d.state,
      d.district,
      d.totalApplications,
      d.approvedCount,
      d.sanctionedAmount,
      d.disbursedAmount,
      d.utilizedAmount,
      d.utilizationRate,
      d.topScheme
    ]);
    analyticsService.exportToCsv('SGDTS_Regional_Analytics_Report.csv', headers, rows);
  };

  const exportComplianceAuditCsv = async () => {
    const reqRes = await complianceService.getAll();
    const reqs = reqRes.data || [];
    const headers = [
      'Requirement ID',
      'Application Reference',
      'Beneficiary',
      'Stage',
      'Requirement Type',
      'Mandatory',
      'Due Date',
      'Status',
      'Verified By'
    ];
    const rows = reqs.map((r) => [
      r.id,
      r.referenceNumber,
      r.beneficiaryName,
      r.stageName,
      r.requirementType,
      r.mandatory ? 'YES' : 'NO',
      r.dueDate,
      r.status,
      r.verifiedBy || 'Pending'
    ]);
    analyticsService.exportToCsv('SGDTS_Compliance_Audit_Log.csv', headers, rows);
  };

  if (loading) {
    return <Loading message="Computing fund utilization and regional analytics models..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-teal-700 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
              Milestone 3 Core Module
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">Post-Disbursement Audit & Regional Telemetry</span>
          </div>
          <h2 className="text-2xl font-bold text-gov-navy-950 mt-1">
            Fund Utilization & Regional Analytics
          </h2>
          <p className="text-sm text-slate-600">
            Monitor ground-level expenditure compliance, track regional fund distribution, and export statutory audit ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportDisbursementLedgerCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition"
              title="Export complete disbursement ledger"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ledger CSV</span>
            </button>
            <button
              onClick={exportRegionalReportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition"
              title="Export regional report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Regional CSV</span>
            </button>
          </div>

          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Utilization Voucher</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Funds Disbursed"
          value={`₹${(Number(disbursementKpis?.totalDisbursedAmount || 17750000) / 100000).toFixed(2)} L`}
          subtitle="Directly credited via DBT"
          icon={Banknote}
          color="navy"
        />
        <StatCard
          title="Verified Utilization"
          value={`₹${(Number(summary?.totalUtilized || 15705000) / 100000).toFixed(2)} L`}
          subtitle="Vouchers cleared by finance desk"
          icon={ShieldCheck}
          color="teal"
        />
        <StatCard
          title="Overall Utilization Rate"
          value={`${summary?.utilizationPercentage || 88.5}%`}
          subtitle="Of disbursed grant tranches"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Pending Utilization Float"
          value={`₹${(Number(summary?.pendingUtilization || 2045000) / 100000).toFixed(2)} L`}
          subtitle="Unspent or under audit"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* SECTION 1: Regional Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gov-teal-600" />
                <span>Regional Disbursement vs Utilization (in ₹ Lakhs)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparison of funds released versus ground-level verified expenditure by district.
              </p>
            </div>

            {/* State Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-1 focus:ring-gov-teal-500"
              >
                <option value="ALL">All States</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Punjab">Punjab</option>
                <option value="Bihar">Bihar</option>
              </select>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value, name) => [`₹${value} Lakhs`, name]}
                  contentStyle={{
                    backgroundColor: '#0b192c',
                    color: '#fff',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    border: 'none',
                    padding: '8px 12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Disbursed" fill="#0b192c" radius={[4, 4, 0, 0]} name="Disbursed (Lakhs)" />
                <Bar dataKey="Utilized" fill="#0d9488" radius={[4, 4, 0, 0]} name="Utilized (Lakhs)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Expenditure Category Share (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              <span>Expenditure Category Distribution</span>
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown of utilized funds across procurement and civil works heads.
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                  contentStyle={{
                    backgroundColor: '#0b192c',
                    color: '#fff',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    border: 'none'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {categoryPieData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-600">{cat.name}</span>
                </div>
                <span className="font-bold text-gov-navy-950">₹{cat.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: Fund Utilization Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-gov-teal-600" />
              <span>Ground Expenditure Vouchers ({utilizations.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Auditable records of funds spent by beneficiaries against sanctioned and disbursed tranches.
            </p>
          </div>

          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 text-gov-teal-400" />
            <span>Record New Voucher</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Application & Beneficiary</th>
                <th className="py-3 px-3">Disbursement Stage</th>
                <th className="py-3 px-3">Category & Invoice</th>
                <th className="py-3 px-3">Disbursed vs Utilized</th>
                <th className="py-3 px-3">Utilization %</th>
                <th className="py-3 px-3">Audit Status</th>
                <th className="py-3 px-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utilizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No utilization vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                utilizations.map((util) => (
                  <tr key={util.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-gov-navy-950 block">{util.referenceNumber}</span>
                      <span className="text-slate-600 font-medium block mt-0.5">{util.beneficiaryName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Voucher ID: {util.id}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-slate-800 font-semibold block">{util.stageName}</span>
                      <span className="text-[10px] text-slate-500 block">Date: {util.utilizationDate}</span>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-200/60 text-slate-700 px-1.5 py-0.5 rounded mb-1">
                        {util.category?.replace('_', ' ')}
                      </span>
                      <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">{util.description}</p>
                      {util.invoiceNumber && (
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Inv: {util.invoiceNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-emerald-700 font-bold block">
                        ₹{Number(util.amountUtilized).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        of ₹{Number(util.amountDisbursed).toLocaleString('en-IN')} tranche
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-gov-navy-950 text-xs block">
                        {util.utilizationPercentage}%
                      </span>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-gov-teal-600 rounded-full"
                          style={{ width: `${Math.min(100, util.utilizationPercentage)}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={util.verificationStatus} size="sm" />
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {util.verificationStatus === 'PENDING' ? (
                        <button
                          onClick={() => {
                            setSelectedUtil(util);
                            setVerifyForm({
                              status: 'VERIFIED',
                              remarks: 'Vouchers verified and audited against statutory ceiling.'
                            });
                            setShowVerifyModal(true);
                          }}
                          className="px-2.5 py-1 bg-gov-navy-900 hover:bg-gov-navy-950 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Audit & Verify
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          {util.verifiedBy || 'Audited'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Scheme Outlay & Tranche Velocity Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-bold text-gov-navy-950 text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gov-teal-600" />
            <span>Scheme-wise DBT & Tranche Velocity Matrix</span>
          </h3>
          <p className="text-xs text-slate-500">
            Performance of gazetted central and state subsidy schemes across financial envelopes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Scheme Name</th>
                <th className="py-3 px-3">Nodal Ministry</th>
                <th className="py-3 px-3 text-right">Total Sanctioned</th>
                <th className="py-3 px-3 text-right">Total Disbursed</th>
                <th className="py-3 px-3 text-right">Total Utilized</th>
                <th className="py-3 px-3 text-right">Utilization Rate</th>
                <th className="py-3 px-3 text-right">Compliance Adherence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schemeData.map((sch) => (
                <tr key={sch.schemeId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-semibold text-gov-navy-950">{sch.schemeName}</td>
                  <td className="py-3 px-3 text-slate-500">{sch.ministry}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium">
                    ₹{Number(sch.totalSanctioned).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-gov-navy-950">
                    ₹{Number(sch.totalDisbursed).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                    ₹{Number(sch.totalUtilized).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      {sch.utilizationRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    {sch.complianceAdherenceRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Utilization Voucher */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Record Fund Utilization Voucher</h3>
                <p className="text-xs text-slate-300">File an auditable expenditure report against disbursed funds</p>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordUtilization} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Select Disbursed Stage *</label>
                <select
                  required
                  value={recordForm.disbursementStageId}
                  onChange={handleStageSelectForRecord}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                >
                  <option value="">-- Choose a Disbursed Tranche --</option>
                  {disbursedStagesList.map((stg) => (
                    <option key={stg.stageId} value={stg.stageId}>
                      {stg.referenceNumber} - {stg.beneficiaryName} - {stg.stageName} (₹{Number(stg.amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 block">
                  Only stages that have already been released (DISBURSED) via DBT can record utilization.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Tranche Disbursed Ceiling</label>
                  <input
                    type="number"
                    disabled
                    value={recordForm.amountDisbursed}
                    className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-slate-600 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Amount Utilized (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={recordForm.amountDisbursed || 9999999}
                    placeholder="e.g. 65000"
                    value={recordForm.amountUtilized}
                    onChange={(e) => setRecordForm({ ...recordForm, amountUtilized: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-gov-navy-950 font-bold focus:ring-1 focus:ring-gov-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Expenditure Category *</label>
                  <select
                    value={recordForm.category}
                    onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                  >
                    <option value="RAW_MATERIALS">Raw Materials & Cement</option>
                    <option value="EQUIPMENT">Machinery & Solar Equipment</option>
                    <option value="LABOR">Local Labor & Masonry Wages</option>
                    <option value="INFRASTRUCTURE">Civil Works & Borewell Drilling</option>
                    <option value="TRAINING">Capacity Building & Training</option>
                    <option value="OPERATIONAL">Operational Overheads</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Invoice / Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. GST-INV-2026-99"
                    value={recordForm.invoiceNumber}
                    onChange={(e) => setRecordForm({ ...recordForm, invoiceNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-1 focus:ring-gov-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Expenditure Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Itemized breakdown of expenditure with supplier names..."
                  value={recordForm.description}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Submit Utilization Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Verify Utilization Record */}
      {showVerifyModal && selectedUtil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gov-navy-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Audit Utilization Voucher</h3>
                <p className="text-xs text-slate-300">Voucher: {selectedUtil.id}</p>
              </div>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleVerifyUtilization} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-bold text-gov-navy-950">{selectedUtil.beneficiaryName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Claimed Amount:</span>
                  <span className="font-extrabold text-emerald-800">
                    ₹{Number(selectedUtil.amountUtilized).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-medium text-slate-700">{selectedUtil.category}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Verification Action *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyForm({ ...verifyForm, status: 'VERIFIED' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      verifyForm.status === 'VERIFIED'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Verify & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyForm({ ...verifyForm, status: 'REJECTED' })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      verifyForm.status === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Reject Voucher
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Auditor Notes *</label>
                <textarea
                  rows={3}
                  required
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
                  Confirm Audit Determination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
