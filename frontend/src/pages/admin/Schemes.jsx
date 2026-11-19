import React, { useState, useEffect } from 'react';
import { Landmark, ArrowRight } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { schemeService } from '../services/schemeService';

export const Schemes = ({ onApplyScheme }) => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    schemeService.getAll().then((res) => {
      setSchemes(res.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loading message="Loading gazetted schemes..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gov-navy-950">
            Government Welfare Schemes Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gazetted subsidy outlays, statutory eligibility criteria, and maximum grant caps (/api/v1/schemes)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {schemes.map((scheme) => (
          <div key={scheme.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-gov-teal-700 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
                  {scheme.schemeCode}
                </span>
                <h3 className="text-base font-bold text-gov-navy-950 mt-1">
                  {scheme.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{scheme.ministry}</p>
              </div>
              <StatusBadge status={scheme.status} size="sm" />
            </div>

            <p className="text-xs text-slate-600 mt-3 line-clamp-2">
              {scheme.description}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Grant Ceiling</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(scheme.minGrantAmount).toLocaleString('en-IN')} – ₹{Number(scheme.maxGrantAmount).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Budget Outlay</span>
                <span className="font-bold text-gov-teal-700">
                  ₹{(scheme.totalBudget / 10000000).toFixed(1)} Cr
                </span>
              </div>
            </div>

            {onApplyScheme && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => onApplyScheme(scheme)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gov-teal-700 hover:text-gov-teal-900 transition"
                >
                  <span>Apply Beneficiary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
