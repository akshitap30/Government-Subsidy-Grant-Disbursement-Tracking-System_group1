import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { SchemeResponse, CreateSchemeRequest, UpdateSchemeRequest } from '@/types/scheme'

const schemeSchema = z
  .object({
    name: z.string().min(3, 'Scheme name must be at least 3 characters'),
    description: z.string().optional(),
    minGrantAmount: z.number().positive('Minimum grant amount must be greater than 0'),
    maxGrantAmount: z.number().positive('Maximum grant amount must be greater than 0'),
  })
  .refine((data) => data.maxGrantAmount >= data.minGrantAmount, {
    message: 'Maximum grant amount must be greater than or equal to minimum amount',
    path: ['maxGrantAmount'],
  })

type SchemeFormData = z.infer<typeof schemeSchema>

export interface SchemeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateSchemeRequest | UpdateSchemeRequest) => Promise<void>
  initialData?: SchemeResponse | null
  isLoading?: boolean
}

export const SchemeFormModal: React.FC<SchemeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEditing = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeFormData>({
    resolver: zodResolver(schemeSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      minGrantAmount: initialData?.minGrantAmount ? Number(initialData.minGrantAmount) : 5000,
      maxGrantAmount: initialData?.maxGrantAmount ? Number(initialData.maxGrantAmount) : 50000,
    },
  })

  // Reset when initialData changes
  React.useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
        minGrantAmount: Number(initialData.minGrantAmount),
        maxGrantAmount: Number(initialData.maxGrantAmount),
      })
    } else {
      reset({
        name: '',
        description: '',
        minGrantAmount: 5000,
        maxGrantAmount: 50000,
      })
    }
  }, [initialData, reset])

  const onFormSubmit = async (data: SchemeFormData) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Subsidy Scheme' : 'Configure New Subsidy Scheme'}
      description="Configure scheme parameters, budgetary limits, and administrative policy boundaries."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Scheme Official Name"
          placeholder="e.g. Pradhan Mantri Kisan Sahayata Yojana"
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <Textarea
          label="Scheme Overview & Policy Objectives"
          placeholder="Detailed description of the entitlement policy, targeted demographic, and objectives..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Minimum Grant Amount (INR ₹)"
            type="number"
            step="0.01"
            required
            error={errors.minGrantAmount?.message}
            {...register('minGrantAmount', { valueAsNumber: true })}
          />

          <Input
            label="Maximum Grant Amount (INR ₹)"
            type="number"
            step="0.01"
            required
            error={errors.maxGrantAmount?.message}
            {...register('maxGrantAmount', { valueAsNumber: true })}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Scheme'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
