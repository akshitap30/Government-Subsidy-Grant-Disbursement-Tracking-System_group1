import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { schemesApi } from '@/api/schemes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { Search, Layers, ArrowRight, CheckCircle2, ShieldCheck, Info } from 'lucide-react'

export const BrowseSchemes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['browse-schemes'],
    queryFn: () => schemesApi.listSchemes('ACTIVE', 0, 100),
  })

  const schemes = data?.content || []
  const filtered = schemes.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Government Subsidy & Grant Programs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore verified government welfare programs, direct benefit entitlements, and financial assistance grants.
          </p>
        </div>
        <div className="w-full md:w-72">
          <Input
            placeholder="Search schemes by name or objective..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading eligible government schemes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No subsidy schemes found"
          description={
            searchTerm
              ? `No active schemes match "${searchTerm}". Try a different keyword.`
              : 'There are currently no active subsidy programs open for public enrollment.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((scheme) => (
            <Card
              key={scheme.id}
              className="flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Open for Enrollment
                  </span>
                  <span className="text-xs text-slate-400 font-mono">v{scheme.configVersion}</span>
                </div>
                <CardTitle className="text-base mt-2">{scheme.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {scheme.description || 'Public entitlement grant sponsored by National DBT Directorate.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Envelope details */}
                <div className="p-3 bg-slate-50 rounded-lg text-xs border border-slate-100 space-y-1">
                  <div className="text-slate-500 font-medium">Grant Financial Envelope</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(scheme.minGrantAmount)} – {formatCurrency(scheme.maxGrantAmount)}
                  </div>
                </div>

                {/* Criteria count and routing stage summary */}
                <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    {scheme.criteria?.length || 0} Eligibility Conditions
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    {scheme.routingRules?.length || 0} Verification Tiers
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Link to={`/beneficiary/schemes/${scheme.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Dossier
                    </Button>
                  </Link>
                  <Link to={`/beneficiary/apply/${scheme.id}`} className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Apply Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

