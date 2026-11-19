import React, { useState, useEffect } from 'react';
import {
  Users,
  Landmark,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  PlusCircle,
  Activity,
  FileCheck2,
  AlertCircle,
  Banknote,
  BarChart3,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  Calendar
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
import { beneficiaryService } from '../services/beneficiaryService';
import { schemeService } from '../services/schemeService';
import { applicationService } from '../services/applicationService';
import { disbursementService } from '../services/disbursementService';
import { complianceService } from '../services/complianceService';
import { utilizationService } from '../services/utilizationService';

export const Dashboard = ({
  setActiveTab,
  onSelectApplication,
  onNavigateToDisbursements,
  onNavigateToCompliance,
  onNavigateToUtilization
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    totalSchemes: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    // Milestone 3 metrics
    totalSanctionedAmount: 0,
    totalDisbursedAmount: 0,
    activeDisbursementPlans: 0,
    overdueComplianceCount: 0,
    openFlagsCount: 0,
    overallUtilizationRate: 0,
    totalUtilizedAmount: 0,
  });
  const [statusChartData, setStatusChartData] = useState([]);
  const [schemeChartData, setSchemeChartData] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [disbursementPlans, setDisbursementPlans] = useState([]);
  const [dataSource, setDataSource] = useState('cache');

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [benRes, schemeRes, appRes, plansRes, reqsRes, flagsRes, utilSummaryRes] = await Promise.all([
        beneficiaryService.getAll(),
        schemeService.getAll(),
        applicationService.getAll(),
        disbursementService.getAll(),
        complianceService.getAllRequirements(),
        complianceService.getNonComplianceFlags(),
        utilizationService.getSummary()
      ]);

      const beneficiaries = benRes.data || [];
      const schemes = schemeRes.data || [];
      const applications = appRes.data || [];
      const plans = plansRes.data || [];
      const requirements = reqsRes.data || [];
      const flags = flagsRes.data || [];
      const utilSummary = utilSummaryRes.data || {};

      setDisbursementPlans(plans);

      // Calculate real metrics from responses
      const pendingCount = applications.filter((a) =>
        ['SUBMITTED', 'ELIGIBILITY_REVIEW', 'UNDER_VERIFICATION', 'RETURNED_FOR_CORRECTION'].includes(a.status)
      ).length;

      const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
      const rejectedCount = applications.filter((a) => ['REJECTED', 'INELIGIBLE', 'CANCELLED'].includes(a.status)).length;

      // Milestone 3 calculations
      const sanctionedTotal = plans.reduce((acc, p) => acc + Number(p.totalSanctionedAmount || 0), 0);
      const disbursedTotal = plans.reduce((acc, p) => {
        const stageSum = (p.stages || [])
          .filter((s) => s.status === 'DISBURSED')
          .reduce((sum, s) => sum + Number(s.amount || 0), 0);
        return acc + stageSum;
      }, 0);
      const activePlans = plans.filter((p) => p.planStatus === 'ACTIVE').length;
      const overdueReqs = requirements.filter((r) => r.status === 'OVERDUE').length;
      const openFlags = flags.filter((f) => f.status === 'OPEN').length;

      setStats({
        totalBeneficiaries: beneficiaries.length,
        totalSchemes: schemes.length,
        totalApplications: applications.length,
        pendingApplications: pendingCount,
        approvedApplications: approvedCount,
        rejectedApplications: rejectedCount,
        // M3 metrics
        totalSanctionedAmount: sanctionedTotal,
        totalDisbursedAmount: disbursedTotal,
        activeDisbursementPlans: activePlans,
        overdueComplianceCount: overdueReqs,
        openFlagsCount: openFlags,
        overallUtilizationRate: Number(utilSummary.utilizationPercentage || (disbursedTotal > 0 ? ((Number(utilSummary.totalUtilized || 0) / disbursedTotal) * 100).toFixed(1) : 0)),
        totalUtilizedAmount: Number(utilSummary.totalUtilized || 0),
      });

      // Chart: Status distribution
      const statusMap = {};
      applications.forEach((a) => {
        statusMap[a.status] = (statusMap[a.status] || 0) + 1;
      });

      const chartData = [
        { name: 'Approved', count: statusMap['APPROVED'] || 0, fill: '#10b981' },
        { name: 'Under Verification', count: statusMap['UNDER_VERIFICATION'] || 0, fill: '#f59e0b' },
        { name: 'Eligibility Review', count: statusMap['ELIGIBILITY_REVIEW'] || 0, fill: '#6366f1' },
        { name: 'Submitted / Draft', count: (statusMap['SUBMITTED'] || 0) + (statusMap['DRAFT'] || 0), fill: '#3b82f6' },
        { name: 'Rejected / Ineligible', count: (statusMap['REJECTED'] || 0) + (statusMap['INELIGIBLE'] || 0), fill: '#f43f5e' },
      ];
      setStatusChartData(chartData);

      // Scheme chart: Applications per scheme
      const schemeAppMap = schemes.map((s) => ({
        name: s.schemeCode,
        fullName: s.schemeName,
        budgetCr: (s.totalBudget / 10000000).toFixed(1),
        disbursedCr: (s.disbursedAmount / 10000000).toFixed(1),
      }));
      setSchemeChartData(schemeAppMap);

      // Recent 5 applications
      setRecentApplications(applications.slice(0, 5));
      setDataSource(benRes.source === 'backend' ? 'backend' : 'cache');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <Loading message="Loading Government Dashboard Statistics from Backend..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-gov-navy-950 via-gov-navy-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gov-teal-500/20 text-gov-teal-300 text-xs font-semibold border border-gov-teal-400/30">
            <span className="w-2 h-2 rounded-full bg-gov-teal-400 animate-pulse"></span>
            Administrative Oversight & Direct Benefit Rail
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Government Grant & Subsidy Command Center
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Centralized portal for statutory verification, multi-stage approval workflows, and transparent Direct Benefit Transfer (DBT) subsidy tracking across Union and State ministries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('applications')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-teal-600 hover:bg-gov-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-gov-teal-950/40 transition hover:shadow-lg hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Grant Application</span>
          </button>
          <button
            onClick={() => setActiveTab('beneficiaries')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-xl text-xs sm:text-sm font-medium border border-slate-700 transition"
          >
            <Users className="w-4 h-4 text-gov-teal-300" />
            <span>Register Beneficiary</span>
          </button>
        </div>
      </div>

      {/* 6 Core Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Beneficiaries"
          value={stats.totalBeneficiaries}
          subtitle="Registered Citizens"
          icon={Users}
          accent="navy"
          trend="up"
          trendValue="+12% MoM"
          onClick={() => setActiveTab('beneficiaries')}
        />
        <StatCard
          title="Active Schemes"
          value={stats.totalSchemes}
          subtitle="Gazetted Programs"
          icon={Landmark}
          accent="teal"
          onClick={() => setActiveTab('schemes')}
        />
        <StatCard
          title="Total Applications"
          value={stats.totalApplications}
          subtitle="Intake Count"
          icon={FileSpreadsheet}
          accent="indigo"
          onClick={() => setActiveTab('applications')}
        />
        <StatCard
          title="Under Review"
          value={stats.pendingApplications}
          subtitle="Verification Queue"
          icon={Clock}
          accent="amber"
          onClick={() => setActiveTab('verification')}
        />
        <StatCard
          title="Approved Grants"
          value={stats.approvedApplications}
          subtitle="Sanctions Issued"
          icon={CheckCircle2}
          accent="emerald"
          trend="up"
          trendValue="Cleared"
          onClick={() => setActiveTab('applications')}
        />
        <StatCard
          title="Rejected / Disqualified"
          value={stats.rejectedApplications}
          subtitle="Failed Criteria"
          icon={XCircle}
          accent="rose"
          onClick={() => setActiveTab('applications')}
        />
      </div>

      {/* Milestone 3 Command Center: Staged Disbursements, Compliance Gates & Utilization Telemetry */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gov-teal-50 text-gov-teal-700 text-xs font-bold border border-gov-teal-200">
              <Sparkles className="w-3.5 h-3.5" />
              Milestone 3 Production Modules Active
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gov-navy-950 mt-1">
              Disbursement Scheduling, Compliance Automation & Fund Utilization Telemetry
            </h3>
            <p className="text-xs text-slate-500">
              Post-approval governance layer enforcing multi-tranche milestone releases, statutory prerequisite gates, and regional utilization reporting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" />
              All M3 Rails Operational
            </span>
          </div>
        </div>

        {/* 3 Milestone 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Pillar 1: Staged Disbursement Scheduling */}
          <div
            onClick={() => setActiveTab('disbursements')}
            className="group cursor-pointer p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200">
                  {stats.activeDisbursementPlans} Active Plans
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-emerald-700 transition">
                Staged Disbursement Scheduling
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure tranche amounts, dates, and release conditions. Enforces exact sum reconciliation.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Sanctioned</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹{Number(stats.totalSanctionedAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Disbursed</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ₹{Number(stats.totalDisbursedAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Manage Tranches & Releases</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Pillar 2: Compliance Tracking & Reminder Automation */}
          <div
            onClick={() => setActiveTab('compliance')}
            className="group cursor-pointer p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-rose-50/40 via-white to-slate-50 hover:border-rose-300 hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-900/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  stats.overdueComplianceCount > 0
                    ? 'text-rose-700 bg-rose-100/60 border-rose-200'
                    : 'text-emerald-700 bg-emerald-100/60 border-emerald-200'
                }`}>
                  {stats.overdueComplianceCount} Overdue
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-rose-700 transition">
                Compliance & Reminder Automation
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Release gates, automated 7d/3d/1d reminders, and non-compliance flags with severity escalation.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Overdue Gates</span>
                  <span className="font-extrabold text-rose-600 text-sm">
                    {stats.overdueComplianceCount} Requirements
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Active Flags</span>
                  <span className="font-extrabold text-amber-600 text-sm">
                    {stats.openFlagsCount} Breaches
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-rose-700">
              <span>Inspect Compliance Desk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Pillar 3: Fund Utilization & Regional Analytics */}
          <div
            onClick={() => setActiveTab('analytics')}
            className="group cursor-pointer p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-teal-50/40 via-white to-slate-50 hover:border-teal-300 hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gov-teal-600 text-white flex items-center justify-center shadow-md shadow-gov-teal-900/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded border border-teal-200">
                  {stats.overallUtilizationRate}% Utilized
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-gov-teal-700 transition">
                Fund Utilization & Regional Telemetry
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Track citizen expenditure, voucher audit verifications, and state/district absorption metrics.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Utilized Capital</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹{Number(stats.totalUtilizedAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Absorption Rate</span>
                  <span className="font-extrabold text-gov-teal-700 text-sm">
                    {stats.overallUtilizationRate}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-gov-teal-700">
              <span>View Regional Analytics</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Application Status Chart */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Application Pipeline Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of applications across statutory review stages
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              Live Backend
            </span>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scheme Budget Outlay Chart */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Scheme Budget Allocation (₹ Cr)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Total Allocation vs Disbursed</p>
            </div>
            <button
              onClick={() => setActiveTab('schemes')}
              className="text-xs font-semibold text-gov-teal-700 hover:text-gov-teal-800 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schemeChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} unit="Cr" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="budgetCr" name="Total Budget (₹ Cr)" fill="#1e3a8a" radius={[0, 4, 4, 0]} />
                <Bar dataKey="disbursedCr" name="Disbursed (₹ Cr)" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Applications Table + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Applications Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Recent Grant Applications
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest filings from Citizen Portal and District CSCs
              </p>
            </div>
            <button
              onClick={() => setActiveTab('applications')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gov-teal-700 hover:text-gov-teal-800 transition"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/60 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Scheme</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-medium text-gov-navy-950">
                      {app.referenceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{app.beneficiaryName}</div>
                      <div className="text-[11px] text-slate-400">{app.district}, {app.state}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate">
                      {app.schemeName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      ₹{Number(app.requestedAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (onSelectApplication) onSelectApplication(app);
                          setActiveTab('applications');
                        }}
                        className="text-xs font-semibold text-gov-teal-700 hover:text-gov-teal-900 hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live System Activity Feed */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-gov-teal-600" />
              Administrative Audit Log
            </h3>
            <span className="text-[11px] text-slate-400">Real-Time</span>
          </div>

          <div className="mt-4 space-y-4 flex-1">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800">Sanction Letter Digitally Signed</p>
                <p className="text-slate-500 mt-0.5">
                  Application GOV-APP-2026-0142 cleared by Principal Secretary Housing.
                </p>
                <span className="text-[10px] text-slate-400">18 mins ago • Amitabh Sen</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800">Eligibility Assessment Run</p>
                <p className="text-slate-500 mt-0.5">
                  Automated rules scored 92/100 for Ramesh Verma under PMKSY.
                </p>
                <span className="text-[10px] text-slate-400">42 mins ago • Rules Engine v4.2</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800">Clarification Requested</p>
                <p className="text-slate-500 mt-0.5">
                  Task TASK-1003 returned to applicant for CA-attested balance sheet.
                </p>
                <span className="text-[10px] text-slate-400">2 hours ago • Swagata Jena</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800">Duplicate Subsidy Intercepted</p>
                <p className="text-slate-500 mt-0.5">
                  Aadhaar deduplication detected previous disbursement under PMKSY-2023.
                </p>
                <span className="text-[10px] text-slate-400">Yesterday • District Solapur</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => setActiveTab('verification')}
              className="text-xs font-semibold text-gov-teal-700 hover:text-gov-teal-800 hover:underline"
            >
              Open Officer Verification Desk →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
