import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, GitFork } from 'lucide-react'
import type { RoutingRuleDto, SchemeResponse } from '@/types/scheme'

export interface SchemeRoutingModalProps {
  isOpen: boolean
  onClose: () => void
  scheme: SchemeResponse | null
  onSaveRoutingRules: (schemeId: string, rules: RoutingRuleDto[]) => Promise<void>
  isLoading?: boolean
}

const AVAILABLE_STAGES = [
  'INITIAL_REVIEW',
  'FIELD_VERIFICATION',
  'DISTRICT_REVIEW',
  'SENIOR_APPROVAL',
  'FINANCE_REVIEW',
]

export const SchemeRoutingModal: React.FC<SchemeRoutingModalProps> = ({
  isOpen,
  onClose,
  scheme,
  onSaveRoutingRules,
  isLoading = false,
}) => {
  const [rules, setRules] = useState<RoutingRuleDto[]>([])

  useEffect(() => {
    if (scheme) {
      setRules(scheme.routingRules || [])
    }
  }, [scheme])

  const handleAddRule = () => {
    const newRule: RoutingRuleDto = {
      minScore: 50,
      maxScore: 100,
      minGrantAmount: scheme ? Number(scheme.minGrantAmount) : 0,
      maxGrantAmount: scheme ? Number(scheme.maxGrantAmount) : 100000,
      stages: ['INITIAL_REVIEW', 'DISTRICT_REVIEW'],
    }
    setRules([...rules, newRule])
  }

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const handleUpdate = (index: number, field: keyof RoutingRuleDto, value: any) => {
    const updated = [...rules]
    updated[index] = { ...updated[index], [field]: value }
    setRules(updated)
  }

  const handleToggleStage = (ruleIndex: number, stage: string) => {
    const rule = rules[ruleIndex]
    const currentStages = rule.stages || []
    const updatedStages = currentStages.includes(stage)
      ? currentStages.filter((s) => s !== stage)
      : [...currentStages, stage]
    handleUpdate(ruleIndex, 'stages', updatedStages)
  }

  const handleSave = async () => {
    if (!scheme) return
    await onSaveRoutingRules(scheme.id, rules)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Routing Rules — ${scheme?.name || ''}`}
      description="Configure multi-stage verification escalation pipelines conditioned on eligibility scores and sanctioned grant limits."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Active Routing Tiers: <span className="font-semibold text-slate-800">{rules.length} tiers</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRule}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Routing Tier
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
            No routing rules defined. Click "Add Routing Tier" to configure verification pathways.
          </div>
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <GitFork className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Tier #{idx + 1} Pipeline
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2 text-xs"
                    onClick={() => handleRemoveRule(idx)}
                    leftIcon={<Trash2 className="h-3 w-3" />}
                  >
                    Delete Tier
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input
                    label="Min Score"
                    type="number"
                    value={rule.minScore}
                    onChange={(e) => handleUpdate(idx, 'minScore', Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Max Score"
                    type="number"
                    value={rule.maxScore}
                    onChange={(e) => handleUpdate(idx, 'maxScore', Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Min Grant (₹)"
                    type="number"
                    value={rule.minGrantAmount || ''}
                    onChange={(e) => handleUpdate(idx, 'minGrantAmount', Number(e.target.value))}
                  />
                  <Input
                    label="Max Grant (₹)"
                    type="number"
                    value={rule.maxGrantAmount || ''}
                    onChange={(e) => handleUpdate(idx, 'maxGrantAmount', Number(e.target.value))}
                  />
                </div>

                {/* Workflow Stages Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Required Verification Stages (Ordered Sequentially)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_STAGES.map((stg) => {
                      const isSelected = rule.stages?.includes(stg)
                      return (
                        <button
                          key={stg}
                          type="button"
                          onClick={() => handleToggleStage(idx, stg)}
                          className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {stg.replace(/_/g, ' ')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isLoading}>
            Update Routing Rules
          </Button>
        </div>
      </div>
    </Modal>
  )
}

