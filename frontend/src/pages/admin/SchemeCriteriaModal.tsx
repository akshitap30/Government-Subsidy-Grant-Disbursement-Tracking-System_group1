import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Plus, Trash2, ShieldAlert, Check } from 'lucide-react'
import type { CriterionDto, CriterionType, SchemeResponse } from '@/types/scheme'

export interface SchemeCriteriaModalProps {
  isOpen: boolean
  onClose: () => void
  scheme: SchemeResponse | null
  onSaveCriteria: (schemeId: string, criteria: CriterionDto[]) => Promise<void>
  isLoading?: boolean
}

export const SchemeCriteriaModal: React.FC<SchemeCriteriaModalProps> = ({
  isOpen,
  onClose,
  scheme,
  onSaveCriteria,
  isLoading = false,
}) => {
  const [criteria, setCriteria] = useState<CriterionDto[]>([])

  useEffect(() => {
    if (scheme) {
      setCriteria(scheme.criteria || [])
    }
  }, [scheme])

  const handleAddCriterion = () => {
    const newCriterion: CriterionDto = {
      criterionId: `CRIT_${Date.now().toString().slice(-4)}`,
      type: 'REQUIRED',
      expectedValue: 'true',
      weight: 10,
      mandatory: true,
      description: 'New Eligibility Condition',
    }
    setCriteria([...criteria, newCriterion])
  }

  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index))
  }

  const handleUpdate = (index: number, field: keyof CriterionDto, value: any) => {
    const updated = [...criteria]
    updated[index] = { ...updated[index], [field]: value }
    setCriteria(updated)
  }

  const handleSave = async () => {
    if (!scheme) return
    await onSaveCriteria(scheme.id, criteria)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Eligibility Criteria — ${scheme?.name || ''}`}
      description="Define the automated evaluation criteria and score weights used by the SGDTS Eligibility Engine."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Active Rules: <span className="font-semibold text-slate-800">{criteria.length} criteria</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCriterion}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Criterion
          </Button>
        </div>

        {criteria.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
            No criteria defined. Click "Add Criterion" to establish evaluation rules.
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {criteria.map((crit, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Criterion ID"
                    value={crit.criterionId}
                    onChange={(e) => handleUpdate(idx, 'criterionId', e.target.value.toUpperCase())}
                    placeholder="e.g. ANNUAL_INCOME"
                    required
                  />
                  <Select
                    label="Evaluation Type"
                    value={crit.type}
                    onChange={(e) => handleUpdate(idx, 'type', e.target.value as CriterionType)}
                  >
                    <option value="NUMERIC_MIN">NUMERIC_MIN (&gt;= Value)</option>
                    <option value="NUMERIC_MAX">NUMERIC_MAX (&lt;= Value)</option>
                    <option value="EQUALS">EQUALS (Exact Match)</option>
                    <option value="NOT_EQUALS">NOT_EQUALS</option>
                    <option value="BOOLEAN">BOOLEAN (true/false)</option>
                    <option value="ENUM_MATCH">ENUM_MATCH</option>
                    <option value="REQUIRED">REQUIRED (Must Provide)</option>
                  </Select>
                  <Input
                    label="Expected / Threshold Value"
                    value={crit.expectedValue || ''}
                    onChange={(e) => handleUpdate(idx, 'expectedValue', e.target.value)}
                    placeholder="e.g. 250000"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <Input
                    label="Score Weight"
                    type="number"
                    step="1"
                    min="0"
                    value={crit.weight}
                    onChange={(e) => handleUpdate(idx, 'weight', Number(e.target.value))}
                    required
                  />
                  <div className="flex items-center gap-2 h-10 px-2">
                    <input
                      type="checkbox"
                      id={`mandatory-${idx}`}
                      checked={crit.mandatory}
                      onChange={(e) => handleUpdate(idx, 'mandatory', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`mandatory-${idx}`} className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Mandatory (Fails if not met)
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveCriterion(idx)}
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <Input
                  label="Description / Citizen Prompt"
                  value={crit.description || ''}
                  onChange={(e) => handleUpdate(idx, 'description', e.target.value)}
                  placeholder="e.g. Annual household gross income must not exceed ₹2,50,000"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isLoading}>
            Update Scheme Criteria
          </Button>
        </div>
      </div>
    </Modal>
  )
}

