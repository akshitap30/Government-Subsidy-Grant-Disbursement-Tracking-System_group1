import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schemesApi } from '@/api/schemes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PaginationControl } from '@/components/common/PaginationControl'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { SchemeFormModal } from './SchemeFormModal'
import { SchemeCriteriaModal } from './SchemeCriteriaModal'
import { SchemeRoutingModal } from './SchemeRoutingModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import type {
  SchemeResponse,
  SchemeStatus,
  CreateSchemeRequest,
  UpdateSchemeRequest,
  CriterionDto,
  RoutingRuleDto,
} from '@/types/scheme'
import {
  Layers,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Sliders,
  GitBranch,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export const SchemeManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  const [statusFilter, setStatusFilter] = useState<SchemeStatus | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [selectedSchemeForEdit, setSelectedSchemeForEdit] = useState<SchemeResponse | null>(null)

  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false)
  const [selectedSchemeForCriteria, setSelectedSchemeForCriteria] = useState<SchemeResponse | null>(null)

  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false)
  const [selectedSchemeForRouting, setSelectedSchemeForRouting] = useState<SchemeResponse | null>(null)

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    schemeId: string
    schemeName: string
    action: 'activate' | 'deactivate'
  }>({
    isOpen: false,
    schemeId: '',
    schemeName: '',
    action: 'activate',
  })

  // Expanded row details
  const [expandedSchemeId, setExpandedSchemeId] = useState<string | null>(null)

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['schemes', statusFilter, page, pageSize],
    queryFn: () => schemesApi.listSchemes(statusFilter, page, pageSize),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (req: CreateSchemeRequest) => schemesApi.createScheme(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'schemes'] })
      success('Subsidy scheme created successfully', 'Scheme Created')
    },
    onError: (err: Error) => error(err.message, 'Creation Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateSchemeRequest }) =>
      schemesApi.updateScheme(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'schemes'] })
      success('Subsidy scheme updated successfully', 'Scheme Updated')
    },
    onError: (err: Error) => error(err.message, 'Update Failed'),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => schemesApi.activateScheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'schemes'] })
      success('Scheme activated for public enrollment', 'Scheme Activated')
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
    },
    onError: (err: Error) => error(err.message, 'Activation Failed'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => schemesApi.deactivateScheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'schemes'] })
      success('Scheme deactivated', 'Scheme Deactivated')
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
    },
    onError: (err: Error) => error(err.message, 'Deactivation Failed'),
  })

  const updateCriteriaMutation = useMutation({
    mutationFn: ({ id, criteria }: { id: string; criteria: CriterionDto[] }) =>
      schemesApi.updateCriteria(id, criteria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      success('Scheme eligibility criteria updated', 'Criteria Saved')
    },
    onError: (err: Error) => error(err.message, 'Criteria Update Failed'),
  })

  const updateRoutingMutation = useMutation({
    mutationFn: ({ id, rules }: { id: string; rules: RoutingRuleDto[] }) =>
      schemesApi.updateRoutingRules(id, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] })
      success('Scheme verification routing rules updated', 'Routing Rules Saved')
    },
    onError: (err: Error) => error(err.message, 'Routing Rules Update Failed'),
  })

  const handleFormSubmit = async (formData: CreateSchemeRequest | UpdateSchemeRequest) => {
    if (selectedSchemeForEdit) {
      await updateMutation.mutateAsync({ id: selectedSchemeForEdit.id, req: formData })
    } else {
      await createMutation.mutateAsync(formData as CreateSchemeRequest)
    }
  }

  const handleConfirmAction = () => {
    if (confirmDialog.action === 'activate') {
      activateMutation.mutate(confirmDialog.schemeId)
    } else {
      deactivateMutation.mutate(confirmDialog.schemeId)
    }
  }

  const schemes = data?.content || []
  const filteredSchemes = schemes.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleExpand = (id: string) => {
    setExpandedSchemeId(expandedSchemeId === id ? null : id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subsidy & Grant Scheme Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Author and govern national grant schemes, eligibility matrices, and verification workflow rules.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setSelectedSchemeForEdit(null)
            setIsFormModalOpen(true)
          }}
        >
          New Subsidy Scheme
        </Button>
      </div>

      {/* Main Scheme List Card */}
      <Card>
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {[
              { label: 'All Schemes', value: undefined },
              { label: 'Active', value: 'ACTIVE' as SchemeStatus },
              { label: 'Draft', value: 'DRAFT' as SchemeStatus },
              { label: 'Inactive', value: 'INACTIVE' as SchemeStatus },
            ].map((tab) => {
              const isSelected = statusFilter === tab.value
              return (
                <button
                  key={tab.label}
                  onClick={() => {
                    setStatusFilter(tab.value)
                    setPage(0)
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <Input
              placeholder="Search scheme name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Content Table */}
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Fetching schemes catalogue..." />
          ) : filteredSchemes.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Layers className="h-8 w-8" />}
                title="No schemes found"
                description={
                  searchTerm
                    ? `No schemes match search query "${searchTerm}".`
                    : 'Get started by creating your first subsidy or grant program.'
                }
                actionText="Create New Scheme"
                onAction={() => {
                  setSelectedSchemeForEdit(null)
                  setIsFormModalOpen(true)
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Scheme Details</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Grant Envelope (Min - Max)</th>
                    <th className="px-6 py-3.5 text-center">Version</th>
                    <th className="px-6 py-3.5 text-center">Criteria / Stages</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchemes.map((scheme) => {
                    const isExpanded = expandedSchemeId === scheme.id
                    return (
                      <React.Fragment key={scheme.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 max-w-sm">
                            <div className="font-semibold text-slate-900">{scheme.name}</div>
                            {scheme.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {scheme.description}
                              </p>
                            )}
                            <div className="text-[11px] text-slate-400 font-mono mt-1">
                              ID: {scheme.id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={scheme.status} type="scheme" />
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {formatCurrency(scheme.minGrantAmount)} –{' '}
                            {formatCurrency(scheme.maxGrantAmount)}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">
                            v{scheme.configVersion}
                          </td>
                          <td className="px-6 py-4 text-center text-xs">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium mr-1.5">
                              {scheme.criteria?.length || 0} Criteria
                            </span>
                            <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                              {scheme.routingRules?.length || 0} Tiers
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Manage Criteria */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSchemeForCriteria(scheme)
                                  setIsCriteriaModalOpen(true)
                                }}
                                title="Configure Eligibility Criteria"
                                className="h-8 px-2 text-xs"
                              >
                                <Sliders className="h-3.5 w-3.5 mr-1" /> Criteria
                              </Button>

                              {/* Manage Routing Rules */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSchemeForRouting(scheme)
                                  setIsRoutingModalOpen(true)
                                }}
                                title="Configure Verification Routing Rules"
                                className="h-8 px-2 text-xs"
                              >
                                <GitBranch className="h-3.5 w-3.5 mr-1" /> Routing
                              </Button>

                              {/* Edit details */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSchemeForEdit(scheme)
                                  setIsFormModalOpen(true)
                                }}
                                title="Edit Scheme Info"
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              {/* Activate / Deactivate Toggle */}
                              {scheme.status === 'ACTIVE' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      schemeId: scheme.id,
                                      schemeName: scheme.name,
                                      action: 'deactivate',
                                    })
                                  }
                                  title="Deactivate Scheme"
                                  className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      schemeId: scheme.id,
                                      schemeName: scheme.name,
                                      action: 'activate',
                                    })
                                  }
                                  title="Activate Scheme"
                                  className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
                                </Button>
                              )}

                              {/* Expand Details button */}
                              <button
                                onClick={() => toggleExpand(scheme.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                title="Toggle details"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Inspection Drawer */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 border-b border-slate-200">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Criteria Breakdown */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Sliders className="h-3.5 w-3.5 text-blue-600" />
                                    Eligibility Criteria ({scheme.criteria?.length || 0})
                                  </h4>
                                  {scheme.criteria?.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No criteria defined yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {scheme.criteria?.map((c, i) => (
                                        <div
                                          key={i}
                                          className="p-2.5 rounded bg-white border border-slate-200 text-xs flex items-center justify-between"
                                        >
                                          <div>
                                            <span className="font-mono font-semibold text-slate-800">
                                              {c.criterionId}
                                            </span>
                                            <span className="ml-2 text-slate-500">
                                              ({c.type} {c.expectedValue ? `→ ${c.expectedValue}` : ''})
                                            </span>
                                            {c.description && (
                                              <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <span className="font-semibold text-slate-700">Weight: {c.weight}</span>
                                            {c.mandatory && (
                                              <span className="ml-2 text-[10px] font-bold uppercase text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                                                Mandatory
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Routing Rules Breakdown */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <GitBranch className="h-3.5 w-3.5 text-indigo-600" />
                                    Routing Workflows ({scheme.routingRules?.length || 0})
                                  </h4>
                                  {scheme.routingRules?.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No routing rules defined yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {scheme.routingRules?.map((r, i) => (
                                        <div
                                          key={i}
                                          className="p-2.5 rounded bg-white border border-slate-200 text-xs space-y-1"
                                        >
                                          <div className="flex justify-between font-medium text-slate-800">
                                            <span>Score Range: {r.minScore} – {r.maxScore}</span>
                                            <span>
                                              Grant: {formatCurrency(r.minGrantAmount)} – {formatCurrency(r.maxGrantAmount)}
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {r.stages?.map((stg, si) => (
                                              <span
                                                key={si}
                                                className="bg-blue-50 text-blue-700 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                              >
                                                {stg.replace(/_/g, ' ')}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && (
            <PaginationControl
              currentPage={page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </CardContent>
      </Card>

      {/* Scheme Form Modal */}
      <SchemeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedSchemeForEdit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Criteria Modal */}
      <SchemeCriteriaModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
        scheme={selectedSchemeForCriteria}
        onSaveCriteria={async (id, criteria) => {
          await updateCriteriaMutation.mutateAsync({ id, criteria })
        }}
        isLoading={updateCriteriaMutation.isPending}
      />

      {/* Routing Modal */}
      <SchemeRoutingModal
        isOpen={isRoutingModalOpen}
        onClose={() => setIsRoutingModalOpen(false)}
        scheme={selectedSchemeForRouting}
        onSaveRoutingRules={async (id, rules) => {
          await updateRoutingMutation.mutateAsync({ id, rules })
        }}
        isLoading={updateRoutingMutation.isPending}
      />

      {/* Activation / Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.action === 'activate'
            ? 'Activate Subsidy Scheme?'
            : 'Deactivate Subsidy Scheme?'
        }
        message={
          confirmDialog.action === 'activate'
            ? `Enabling "${confirmDialog.schemeName}" will immediately open it for citizen applications and automated eligibility scoring.`
            : `Deactivating "${confirmDialog.schemeName}" will prevent new applications from being created for this scheme.`
        }
        variant={confirmDialog.action === 'activate' ? 'primary' : 'danger'}
        confirmText={confirmDialog.action === 'activate' ? 'Activate Now' : 'Deactivate'}
        isLoading={activateMutation.isPending || deactivateMutation.isPending}
      />
    </div>
  )
}

