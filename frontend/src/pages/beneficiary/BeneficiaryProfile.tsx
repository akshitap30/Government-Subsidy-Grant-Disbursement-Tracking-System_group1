import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { beneficiariesApi } from '@/api/beneficiaries'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, MapPin, Mail, Phone, Calendar, ShieldCheck, UserPlus, CheckCircle } from 'lucide-react'
import type { RegisterBeneficiaryRequest, UpdateBeneficiaryRequest } from '@/types/beneficiary'

const citizenSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
  dateOfBirth: z.string().min(10, 'Date of birth is required'),
})

type CitizenFormData = z.infer<typeof citizenSchema>

export const BeneficiaryProfile: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { beneficiaryId, setBeneficiaryId, currentBeneficiary, setCurrentBeneficiary } = useAuth()

  // Fetch beneficiary by ID if set
  const { data: profile, isLoading } = useQuery({
    queryKey: ['beneficiary', beneficiaryId],
    queryFn: () => beneficiariesApi.getById(beneficiaryId),
    enabled: Boolean(beneficiaryId),
  })

  // List all beneficiaries for demo quick-picker
  const { data: allBeneficiaries } = useQuery({
    queryKey: ['beneficiaries', 'picker'],
    queryFn: () => beneficiariesApi.listAll(0, 50),
  })

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (req: UpdateBeneficiaryRequest) =>
      beneficiariesApi.update(beneficiaryId, req),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId] })
      setCurrentBeneficiary(updated)
      success('Your beneficiary profile details were saved.', 'Profile Updated')
    },
    onError: (err: Error) => error(err.message, 'Update Failed'),
  })

  // Register new citizen mutation
  const registerMutation = useMutation({
    mutationFn: (req: RegisterBeneficiaryRequest) => beneficiariesApi.register(req),
    onSuccess: (newCitizen) => {
      setBeneficiaryId(newCitizen.id)
      setCurrentBeneficiary(newCitizen)
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      success(`Enrolled ${newCitizen.fullName} in citizen registry!`, 'Registration Complete')
    },
    onError: (err: Error) => error(err.message, 'Enrollment Failed'),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CitizenFormData>({
    resolver: zodResolver(citizenSchema),
  })

  useEffect(() => {
    if (profile) {
      setCurrentBeneficiary(profile)
      reset({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        district: profile.district,
        state: profile.state,
        dateOfBirth: profile.dateOfBirth,
      })
    }
  }, [profile, reset, setCurrentBeneficiary])

  const onUpdateProfile = (data: CitizenFormData) => {
    updateMutation.mutate({
      fullName: data.fullName,
      phone: data.phone,
      address: data.address,
      district: data.district,
      state: data.state,
    })
  }

  const onRegisterNew = (data: CitizenFormData) => {
    registerMutation.mutate(data)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Citizen Beneficiary Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your official demographic records, direct benefit transfer (DBT) credentials, and contact details.
        </p>
      </div>

      {/* Demo Persona Quick-Picker */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Demo Citizen Switcher
              </p>
              <p className="text-xs text-blue-700">
                {beneficiaryId
                  ? `Active Citizen ID: ${beneficiaryId}`
                  : 'No citizen persona selected yet. Pick an existing citizen or register below.'}
              </p>
            </div>
          </div>
          {allBeneficiaries && allBeneficiaries.content.length > 0 && (
            <select
              value={beneficiaryId}
              onChange={(e) => {
                const selected = allBeneficiaries.content.find((b) => b.id === e.target.value)
                setBeneficiaryId(e.target.value)
                if (selected) setCurrentBeneficiary(selected)
              }}
              className="h-8 px-2.5 py-1 text-xs rounded border border-blue-300 bg-white text-slate-800 font-medium"
            >
              <option value="">-- Choose Existing Citizen --</option>
              {allBeneficiaries.content.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.fullName} ({b.district}, {b.state})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {/* If beneficiary is selected, show profile details & edit form */}
      {beneficiaryId && profile ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Snapshot Card */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-20 w-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                {profile.fullName.slice(0, 2).toUpperCase()}
              </div>
              <CardTitle className="mt-3 text-lg">{profile.fullName}</CardTitle>
              <div className="mt-1">
                <StatusBadge status={profile.profileStatus} type="profile" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 text-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{profile.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Born: {formatDate(profile.dateOfBirth)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{profile.district}, {profile.state}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 font-mono text-[10px] text-slate-400 break-all">
                ID: {profile.id}
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Update Contact & Address Information</CardTitle>
              <CardDescription>
                Ensure your residence details match your official local governance documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
                <Input
                  label="Full Name"
                  required
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address (Locked)"
                    disabled
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  <Input
                    label="Mobile Phone"
                    required
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>

                <Input
                  label="Residential Address"
                  required
                  error={errors.address?.message}
                  {...register('address')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="District"
                    required
                    error={errors.district?.message}
                    {...register('district')}
                  />
                  <Input
                    label="State / Union Territory"
                    required
                    error={errors.state?.message}
                    {...register('state')}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={updateMutation.isPending}
                  >
                    Save Updated Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Citizen Registration Form */
        <Card>
          <CardHeader>
            <CardTitle>Register as a Citizen Beneficiary</CardTitle>
            <CardDescription>
              Create your official citizen profile to browse subsidy schemes, verify grant eligibility, and submit claims.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onRegisterNew)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Meera Devi Sharma"
                required
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. meera.sharma@example.com"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Mobile Phone Number"
                  placeholder="+91 9876543210"
                  required
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>

              <Input
                label="Residential Address"
                placeholder="Village / Ward / Street, Post Office"
                required
                error={errors.address?.message}
                {...register('address')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="District"
                  placeholder="e.g. Jaipur"
                  required
                  error={errors.district?.message}
                  {...register('district')}
                />
                <Input
                  label="State / UT"
                  placeholder="e.g. Rajasthan"
                  required
                  error={errors.state?.message}
                  {...register('state')}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  required
                  error={errors.dateOfBirth?.message}
                  {...register('dateOfBirth')}
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  isLoading={registerMutation.isPending}
                >
                  Complete Citizen Enrollment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

