import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Send,
  Building,
  User,
  ExternalLink,
  Banknote,
  ShieldAlert
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { ApplicationDetails } from './ApplicationDetails';
import { applicationService } from '../services/applicationService';
import { beneficiaryService } from '../services/beneficiaryService';
import { schemeService } from '../services/schemeService';

export const Applications = ({
  preselectedScheme,
  preselectedBeneficiary,
  onNavigateToEligibility,
  onNavigateToVerification,
  onNavigateToDisbursements,
  onNavigateToCompliance,
  onNavigateToUtilization,
}) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [schemeFilter, setSchemeFilter] = useState('ALL');
  const [selectedApplication, setSelectedApplication] = useState(null);

  // Lists for Form Dropdowns
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [schemes, setSchemes] = useState([]);

  // Create Application Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    beneficiaryId: '',
    schemeId: '',
    requestedAmount: '',
    purpose: '',
  });
  const [selectedSchemeDetails, setSelectedSchemeDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await applicationService.getAll({
        search,
        status: statusFilter,
        schemeId: schemeFilter,
      });
      setApplications(res.data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [benRes, schRes] = await Promise.all([
        beneficiaryService.getAll(),
        schemeService.getAll(),
      ]);
      setBeneficiaries(benRes.data || []);
      setSchemes(schRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [search, statusFilter, schemeFilter]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  // Handle preselected props from other pages
  useEffect(() => {
    if (preselectedScheme || preselectedBeneficiary) {
      setFormData({
        beneficiaryId: preselectedBeneficiary ? preselectedBeneficiary.id : '',
        schemeId: preselectedScheme ? preselectedScheme.id : '',
        requestedAmount: preselectedScheme ? String(preselectedScheme.maxGrantAmount || '') : '',
        purpose: '',
      });
      if (preselectedScheme) {
        setSelectedSchemeDetails(preselectedScheme);
      }
      setIsFormOpen(true);
    }
  }, [preselectedScheme, preselectedBeneficiary]);

  const handleOpenAdd = () => {
    setFormData({
      beneficiaryId: beneficiaries[0]?.id || '',
      schemeId: schemes[0]?.id || '',
      requestedAmount: schemes[0]?.maxGrantAmount || '',
      purpose: '',
    });
    setSelectedSchemeDetails(schemes[0] || null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSchemeSelect = (schemeId) => {
    const s = schemes.find((item) => item.id === schemeId);
    setSelectedSchemeDetails(s || null);
    setFormData((prev) => ({
      ...prev,
      schemeId,
      requestedAmount: s ? String(s.maxGrantAmount) : prev.requestedAmount,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const ben = beneficiaries.find((b) => b.id === formData.beneficiaryId);
    const sch = schemes.find((s) => s.id === formData.schemeId);

    if (!ben || !sch) {
      setFormError('Please select both a valid Beneficiary and a Grant Scheme.');
      return;
    }

    const amount = Number(formData.requestedAmount);
    if (!amount || amount <= 0) {
      setFormError('Requested grant amount must be greater than zero.');
      return;
    }

    if (sch.maxGrantAmount && amount > sch.maxGrantAmount) {
      setFormError(
        `Requested amount (₹${amount.toLocaleString('en-IN')}) exceeds statutory scheme ceiling (₹${sch.maxGrantAmount.toLocaleString('en-IN')}).`
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        beneficiaryId: ben.id,
        beneficiaryName: ben.fullName,
        nationalId: ben.nationalId,
        category: ben.category,
        annualIncome: ben.annualIncome,
        district: ben.district,
        state: ben.state,
        schemeId: sch.id,
        schemeName: sch.schemeName,
        requestedAmount: amount,
        purpose: formData.purpose.trim() || `Grant application for ${sch.schemeName}`,
      };

      await applicationService.create(payload);
      setIsFormOpen(false);
      fetchApplications();
    } catch (err) {
      setFormError(err.message || 'Error submitting application');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Reference # & Date',
      key: 'referenceNumber',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-gov-navy-950 text-xs">{row.referenceNumber}</span>
          <div className="text-[11px] text-slate-400">
            {row.submissionDate
              ? new Date(row.submissionDate).toLocaleDateString('en-IN')
              : 'Recent'}
          </div>
        </div>
      ),
    },
    {
      header: 'Beneficiary',
      key: 'beneficiaryName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.beneficiaryName}</div>
          <div className="text-[11px] text-slate-500">
            {row.district}, {row.state} • <span className="font-medium text-slate-700">{row.category}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Scheme Name',
      key: 'schemeName',
      render: (row) => (
        <div className="max-w-xs truncate text-xs font-medium text-slate-700" title={row.schemeName}>
          {row.schemeName}
        </div>
      ),
    },
    {
      header: 'Requested Amount',
      key: 'requestedAmount',
      render: (row) => (
        <span className="font-extrabold text-xs text-slate-900">
          ₹{Number(row.requestedAmount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Current Stage',
      key: 'currentStage',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
          {row.currentStage?.replace(/_/g, ' ') || 'Initial Review'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSelectedApplication(row)}
            className="p-1.5 text-slate-600 hover:text-gov-teal-700 hover:bg-slate-100 rounded-lg transition"
            title="Inspect Dossier"
          >
            <Eye className="w-4 h-4" />
          </button>
          {onNavigateToEligibility && (
            <button
              onClick={() => onNavigateToEligibility(row)}
              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-slate-100 rounded-lg transition"
              title="Eligibility Assessment"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          {row.status === 'APPROVED' && onNavigateToDisbursements && (
            <button
              onClick={() => onNavigateToDisbursements(row)}
              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
              title="Staged Disbursements"
            >
              <Banknote className="w-4 h-4" />
            </button>
          )}
          {row.status === 'APPROVED' && onNavigateToCompliance && (
            <button
              onClick={() => onNavigateToCompliance(row)}
              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
              title="Compliance Gates"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gov-navy-950">
            Grant Applications Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Intake registry, statutory scrutiny, multi-tier verification routing (/api/v1/applications)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gov-teal-600 hover:bg-gov-teal-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-gov-teal-950/20 transition hover:shadow-lg hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Grant Application</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference #, beneficiary name, or district..."
        filterComponent={
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-teal-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="ELIGIBILITY_REVIEW">Eligibility Review</option>
                <option value="UNDER_VERIFICATION">Under Verification</option>
                <option value="RETURNED_FOR_CORRECTION">Returned for Correction</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="INELIGIBLE">Ineligible</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Scheme:</span>
              <select
                value={schemeFilter}
                onChange={(e) => setSchemeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 max-w-[170px] truncate focus:outline-none focus:ring-2 focus:ring-gov-teal-500"
              >
                <option value="ALL">All Schemes</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.schemeCode}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      {/* Application Dossier View Modal */}
      {selectedApplication && (
        <ApplicationDetails
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onNavigateToEligibility={onNavigateToEligibility}
          onNavigateToVerification={onNavigateToVerification}
          onNavigateToDisbursements={onNavigateToDisbursements}
          onNavigateToCompliance={onNavigateToCompliance}
          onNavigateToUtilization={onNavigateToUtilization}
        />
      )}

      {/* New Grant Application Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gov-navy-950 to-gov-navy-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gov-teal-500/20 text-gov-teal-300 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">New Grant Application Intake</h3>
                  <p className="text-xs text-slate-300">
                    Direct Benefit Subsidy Queue (/api/v1/applications)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="m-5 mb-0 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
              {/* Beneficiary Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Registered Beneficiary *
                </label>
                <select
                  required
                  value={formData.beneficiaryId}
                  onChange={(e) => setFormData({ ...formData, beneficiaryId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-teal-500"
                >
                  <option value="">-- Choose Beneficiary --</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.fullName} ({b.registrationNumber}) • {b.category} • {b.district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheme Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Gazetted Scheme *
                </label>
                <select
                  required
                  value={formData.schemeId}
                  onChange={(e) => handleSchemeSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-teal-500"
                >
                  <option value="">-- Choose Grant Scheme --</option>
                  {schemes
                    .filter((s) => s.status === 'ACTIVE')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.schemeCode} - {s.schemeName} (Cap: ₹{s.maxGrantAmount?.toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>

              {/* Scheme Cap Notice */}
              {selectedSchemeDetails && (
                <div className="p-3 bg-gov-teal-50/70 border border-gov-teal-200 rounded-xl text-xs text-gov-teal-900 flex items-start gap-2">
                  <Building className="w-4 h-4 text-gov-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{selectedSchemeDetails.schemeName}</span>
                    <p className="text-[11px] text-gov-teal-800 mt-0.5">
                      Statutory Grant Ceiling:{' '}
                      <span className="font-bold">
                        ₹{Number(selectedSchemeDetails.maxGrantAmount || 0).toLocaleString('en-IN')}
                      </span>{' '}
                      • {selectedSchemeDetails.ministryName}
                    </p>
                  </div>
                </div>
              )}

              {/* Requested Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Grant Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-teal-500"
                />
              </div>

              {/* Purpose / Project Proposal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subsidy Purpose / Project Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Describe the asset, equipment, or capital expenditure to be financed by this grant..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-teal-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gov-teal-600 hover:bg-gov-teal-500 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Transmitting to Backend...' : 'Submit Grant Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
