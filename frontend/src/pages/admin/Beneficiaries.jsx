import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, UserCheck, ShieldCheck } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { beneficiaryService } from '../services/beneficiaryService';

export const Beneficiaries = ({ onApplyForBeneficiary }) => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    beneficiaryService.getAll().then((res) => {
      setBeneficiaries(res.data || []);
      setLoading(false);
    });
  }, []);

  const columns = [
    {
      header: 'Beneficiary Name',
      key: 'fullName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.fullName}</div>
          <div className="text-xs text-slate-500">{row.email} • {row.phone}</div>
        </div>
      )
    },
    {
      header: 'Aadhaar / APBS',
      key: 'aadhaarNumber',
      render: (row) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {row.aadhaarNumber}
        </span>
      )
    },
    {
      header: 'Category',
      key: 'socialCategory',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
          {row.socialCategory}
        </span>
      )
    },
    {
      header: 'Location',
      key: 'district',
      render: (row) => <span>{row.district}, {row.state}</span>
    },
    {
      header: 'Bank Details',
      key: 'bankAccountNumber',
      render: (row) => (
        <div className="text-xs">
          <div>A/C: •••• {row.bankAccountNumber ? row.bankAccountNumber.slice(-4) : 'XXXX'}</div>
          <div className="text-slate-400 font-mono text-[10px]">{row.bankIfscCode}</div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'profileStatus',
      render: (row) => <StatusBadge status={row.profileStatus} size="sm" />
    }
  ];

  if (loading) return <Loading message="Loading citizen registry..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gov-navy-950">
            Citizen Beneficiary Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            National DBT identity registry, Aadhaar seeding, bank IFSC routing (/api/v1/beneficiaries)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Enrolled" value={beneficiaries.length} icon={Users} color="teal" />
        <StatCard title="Active Beneficiaries" value={beneficiaries.filter(b => b.profileStatus === 'ACTIVE').length} icon={UserCheck} color="emerald" />
        <StatCard title="Aadhaar APBS Linked" value={`${beneficiaries.length} / ${beneficiaries.length}`} icon={ShieldCheck} color="blue" />
      </div>

      <DataTable
        columns={columns}
        data={beneficiaries}
        searchPlaceholder="Search citizen by name, email, district..."
      />
    </div>
  );
};
