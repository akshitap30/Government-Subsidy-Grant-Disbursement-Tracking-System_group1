import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { beneficiariesApi } from '@/api/beneficiaries'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PaginationControl } from '@/components/common/PaginationControl'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type {
  BeneficiaryResponse,
  RegisterBeneficiaryRequest,
  UpdateBeneficiaryRequest,
} from '@/types/beneficiary'
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  CheckCircle,
  ExternalLink,
  MapPin,
  Calendar,
  Mail,
  Phone,
} from 'lucide-react'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(5, 'Address is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
  dateOfBirth: z.string().min(10, 'Date of birth is required'),
})

type RegisterFormData = z.infer<typeof registerSchema>

export const BeneficiaryManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { setBeneficiaryId, setCurrentBeneficiary, setRole } = useAuth()

  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryResponse | null>(null)

  // Fetch beneficiaries
  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaries', page, pageSize],
    queryFn: () => beneficiariesApi.listAll(page, pageSize),
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (req: RegisterBeneficiaryRequest) => beneficiariesApi.register(req),
    onSuccess: (newBeneficiary) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'beneficiaries'] })
      success(`Beneficiary ${newBeneficiary.fullName} registered successfully`, 'Registration Complete')
      setIsRegisterModalOpen(false)
    },
    onError: (err: Error) => error(err.message, 'Registration Failed'),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateBeneficiaryRequest }) =>
      beneficiariesApi.update(id, req),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] })
      success(`Beneficiary ${updated.fullName} updated`, 'Profile Updated')
      setIsEditModalOpen(false)
    },
    onError: (err: Error) => error(err.message, 'Update Failed'),
  })

  // Register Form
  const {
    register: regForm,
    handleSubmit: handleRegSubmit,
    reset: resetRegForm,
    formState: { errors: regErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      district: '',
      state: 'New Delhi',
      dateOfBirth: '1990-01-01',
    },
  })

  // Edit Form
  const {
    register: editForm,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<UpdateBeneficiaryRequest>()

  const openEditModal = (b: BeneficiaryResponse) => {
    setSelectedBeneficiary(b)
    resetEditForm({
      fullName: b.fullName,
      phone: b.phone,
      address: b.address,
      district: b.district,
      state: b.state,
    })
    setIsEditModalOpen(true)
  }

  const handleSelectAsActiveCitizen = (b: BeneficiaryResponse) => {
    setBeneficiaryId(b.id)
    setCurrentBeneficiary(b)
    success(`Active citizen persona set to ${b.fullName}`, 'Persona Updated')
  }

  const beneficiaries = data?.content || []
  const filtered = beneficiaries.filter(
    (b) =>
      b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phone.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Citizen Beneficiary Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain national beneficiary registry, verify contact profiles, and inspect subsidy dossiers.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={() => {
            resetRegForm()
            setIsRegisterModalOpen(true)
          }}
        >
          Register New Citizen
        </Button>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Search header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by citizen name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Seeded: <span className="font-semibold text-slate-800">{data?.totalElements || 0}</span>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading beneficiary registry..." />
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No beneficiaries found"
                description={
                  searchTerm
                    ? `No registered beneficiaries match "${searchTerm}".`
                    : 'Enroll the first citizen beneficiary to begin processing grant applications.'
                }
                actionText="Register Citizen"
                onAction={() => {
                  resetRegForm()
                  setIsRegisterModalOpen(true)
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Citizen Profile</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5">Location / Jurisdiction</th>
                    <th className="px-6 py-3.5">Date of Birth</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{b.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          UUID: {b.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{b.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{b.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{b.district}, {b.state}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {b.address}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {formatDate(b.dateOfBirth)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={b.profileStatus} type="profile" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Set as demo active citizen */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAsActiveCitizen(b)}
                            title="Simulate this citizen in Beneficiary Portal"
                            className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Use in Demo
                          </Button>

                          {/* Edit Profile */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(b)}
                            title="Edit Beneficiary Details"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

      {/* Register Beneficiary Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Citizen Beneficiary Enrollment"
        description="Seed official citizen demographics into the National DBT database."
        maxWidth="lg"
      >
        <form
          onSubmit={handleRegSubmit((formData) => registerMutation.mutate(formData))}
          className="space-y-4"
        >
          <Input
            label="Full Name (as per Aadhaar / National ID)"
            placeholder="e.g. Ramesh Kumar Verma"
            required
            error={regErrors.fullName?.message}
            {...regForm('fullName')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. ramesh.verma@example.com"
              required
              error={regErrors.email?.message}
              {...regForm('email')}
            />
            <Input
              label="Mobile Phone Number"
              placeholder="+91 9876543210"
              required
              error={regErrors.phone?.message}
              {...regForm('phone')}
            />
          </div>

          <Input
            label="Residential Address"
            placeholder="House/Plot No, Village/Colony, Post Office"
            required
            error={regErrors.address?.message}
            {...regForm('address')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="District"
              placeholder="e.g. Varanasi"
              required
              error={regErrors.district?.message}
              {...regForm('district')}
            />
            <Input
              label="State / UT"
              placeholder="e.g. Uttar Pradesh"
              required
              error={regErrors.state?.message}
              {...regForm('state')}
            />
            <Input
              label="Date of Birth"
              type="date"
              required
              error={regErrors.dateOfBirth?.message}
              {...regForm('dateOfBirth')}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRegisterModalOpen(false)}
              disabled={registerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={registerMutation.isPending}
            >
              Register Citizen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Beneficiary Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Update Profile — ${selectedBeneficiary?.fullName || ''}`}
        description="Update citizen residential location and contact information."
        maxWidth="lg"
      >
        <form
          onSubmit={handleEditSubmit((formData) => {
            if (selectedBeneficiary) {
              updateMutation.mutate({ id: selectedBeneficiary.id, req: formData })
            }
          })}
          className="space-y-4"
        >
          <Input
            label="Full Name"
            required
            error={editErrors.fullName?.message}
            {...editForm('fullName')}
          />

          <Input
            label="Mobile Phone Number"
            required
            error={editErrors.phone?.message}
            {...editForm('phone')}
          />

          <Input
            label="Residential Address"
            required
            error={editErrors.address?.message}
            {...editForm('address')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="District"
              required
              error={editErrors.district?.message}
              {...editForm('district')}
            />
            <Input
              label="State / UT"
              required
              error={editErrors.state?.message}
              {...editForm('state')}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

