import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { schemesApi } from '@/api/schemes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Sliders,
  GitBranch,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Calendar,
} from 'lucide-react'

export const SchemeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: scheme, isLoading } = useQuery({
    queryKey: ['scheme-details', id],
    queryFn: () => schemesApi.getScheme(id!),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return <LoadingSpinner text="Fetching official scheme policy dossier..." />
  }

  if (!scheme) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Scheme Not Found</h2>
        <p className="text-sm text-slate-500">The requested subsidy scheme could not be located.</p>
        <Link to="/beneficiary/schemes">
          <Button variant="outline">Back to Scheme Directory</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/beneficiary/schemes"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Scheme Directory
        </Link>
      </div>

      {/* Main Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={scheme.status} type="scheme" />
              <span className="text-xs font-mono text-slate-400">Ruleset v{scheme.configVersion}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Established: {formatDate(scheme.createdAt)}
            </div>
          </div>
          <CardTitle className="text-2xl mt-2">{scheme.name}</CardTitle>
          <CardDescription className="text-base text-slate-600 mt-2 leading-relaxed">
            {scheme.description || 'No detailed policy description provided.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Grant Bounds Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sanctioned Minimum Grant
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {formatCurrency(scheme.minGrantAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Maximum Grant Ceiling
              </p>
              <p className="text-xl font-bold text-blue-700 mt-0.5">
                {formatCurrency(scheme.maxGrantAmount)}
              </p>
            </div>
          </div>

          {/* Eligibility Criteria Matrix */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Sliders className="h-4 w-4 text-blue-600" />
              Evaluation Criteria & Policy Requirements ({scheme.criteria?.length || 0})
            </h3>
            {scheme.criteria?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No specific criteria defined for this scheme.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Criterion</th>
                      <th className="px-4 py-2.5">Validation Rule</th>
                      <th className="px-4 py-2.5">Target Value</th>
                      <th className="px-4 py-2.5 text-center">Score Weight</th>
                      <th className="px-4 py-2.5 text-right">Mandatory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheme.criteria?.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div>{c.description || c.criterionId}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.criterionId}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{c.type}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {c.expectedValue || 'Any Valid Input'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">
                          {c.weight} pts
                        </td>
                        <td className="px-4 py-3 text-right">
                          {c.mandatory ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-50 text-rose-700 border border-rose-200">
                              Mandatory
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                              Optional
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Verification Pipeline Preview */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <GitBranch className="h-4 w-4 text-indigo-600" />
              Multi-Stage Verification Workflow Preview
            </h3>
            {scheme.routingRules?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Default administrative verification applies.</p>
            ) : (
              <div className="space-y-2">
                {scheme.routingRules?.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>Condition: Eligibility Score {r.minScore} – {r.maxScore}</span>
                      <span>
                        Grant: {formatCurrency(r.minGrantAmount)} – {formatCurrency(r.maxGrantAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 font-medium">Pipeline:</span>
                      {r.stages?.map((stg, si) => (
                        <span
                          key={si}
                          className="bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]"
                        >
                          {si + 1}. {stg.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link to="/beneficiary/schemes">
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Link to={`/beneficiary/apply/${scheme.id}`}>
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Proceed to Online Application
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

