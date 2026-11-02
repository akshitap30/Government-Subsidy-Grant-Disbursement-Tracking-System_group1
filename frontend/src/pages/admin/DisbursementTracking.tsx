import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { applicationsApi } from '@/api/applications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  CreditCard,
  AlertCircle,
  FileCode2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Landmark,
  ShieldAlert,
  Send,
} from 'lucide-react'

export const DisbursementTracking: React.FC = () => {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)

  // Fetch approved applications from live backend
  const { data: approvedAppsData, isLoading } = useQuery({
    queryKey: ['disbursement-approved-apps'],
    queryFn: () => applicationsApi.listApplications({ status: 'APPROVED', page: 0, size: 50 }),
  })

  const approvedApps = approvedAppsData?.content || []
  const totalApprovedAmount = approvedApps.reduce(
    (acc, app) => acc + (Number(app.requestedAmount) || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Direct Benefit Transfer (DBT) Disbursement Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            PFMS / NPCI Aadhaar Payment Bridge System (APBS) mandate generation and banking tranche reconciliation.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<FileCode2 className="h-4 w-4 text-blue-600" />}
          onClick={() => setIsContractModalOpen(true)}
        >
          View Missing Backend API Requirement
        </Button>
      </div>

      {/* Prominent Architectural Gap Notice as required by prompt */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-900">
          <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
          Backend Integration Notice — Pending Disbursement Microservice
        </div>
        <p className="leading-relaxed">
          The existing Spring Boot service contains modules for <code>/api/v1/schemes</code>, <code>/api/v1/beneficiaries</code>, <code>/api/v1/applications</code>, <code>/api/v1/verification</code>, and <code>/api/v1/eligibility</code>. The dedicated payment gateway disbursement execution endpoint (e.g. <code>POST /api/v1/disbursements/batch</code>) is documented as an upcoming backend requirement. All data below is populated from live sanctioned applications in status <strong>APPROVED</strong>.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sanctioned for Disbursement
              </p>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalApprovedAmount)}
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {approvedApps.length} Sanctioned claims ready
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment Channel
              </p>
              <div className="text-base font-bold text-slate-900 mt-1">
                PFMS / NPCI APBS
              </div>
              <p className="text-xs text-slate-500 mt-1">Aadhaar Payment Bridge</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Landmark className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reconciliation SLA
              </p>
              <div className="text-base font-bold text-slate-900 mt-1">
                T+2 Banking Days
              </div>
              <p className="text-xs text-slate-500 mt-1">Automated credit response</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approved Claims Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sanctioned Claims Awaiting Disbursement Tranche</CardTitle>
            <CardDescription>
              Applications that have successfully completed multi-stage verification and are ready for fund release.
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={approvedApps.length === 0}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            onClick={() => setIsContractModalOpen(true)}
          >
            Generate PFMS Batch Mandate
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Querying sanctioned grant claims..." />
          ) : approvedApps.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No Approved Grants Ready for Disbursement</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Applications will appear here once officers record final approval decisions in the verification queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Sanction Order / Ref</th>
                    <th className="px-6 py-3.5">Scheme ID</th>
                    <th className="px-6 py-3.5">Beneficiary UUID</th>
                    <th className="px-6 py-3.5">Sanctioned Amount</th>
                    <th className="px-6 py-3.5">Verification Outcome</th>
                    <th className="px-6 py-3.5">Approval Date</th>
                    <th className="px-6 py-3.5 text-right">Disbursement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvedApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-blue-600">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {app.schemeId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {app.beneficiaryId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatCurrency(app.requestedAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(app.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                          <Clock className="h-3 w-3" /> Ready for PFMS Batch
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backend API Documentation Modal */}
      <Modal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title="Documented Missing Backend Requirement: Disbursement API"
        description="Comprehensive technical specification for the Spring Boot Disbursement controller and database entities."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs text-slate-700 font-sans leading-relaxed">
          <div className="p-3 bg-slate-100 rounded-lg font-mono text-[11px] space-y-1">
            <p className="font-bold text-slate-900">Target Endpoints to Implement in Spring Boot:</p>
            <p className="text-blue-700">POST /api/v1/disbursements/batches</p>
            <p className="text-blue-700">GET /api/v1/disbursements/batches/&#123;batchId&#125;</p>
            <p className="text-blue-700">POST /api/v1/disbursements/batches/&#123;batchId&#125;/reconcile</p>
            <p className="text-blue-700">GET /api/v1/applications/&#123;id&#125;/disbursement</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-1">Recommended Database Entity (DisbursementRecord):</h4>
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-[11px] font-mono">
{`@Entity
@Table(name = "disbursement_records")
public class DisbursementRecord {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private UUID applicationId;
    private UUID beneficiaryId;
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    private DisbursementStatus status; // PENDING, PROCESSING, COMPLETED, FAILED
    private String utrNumber; // Bank Unique Transaction Reference
    private String paymentBatchId;
    private LocalDateTime disbursedAt;
    private LocalDateTime reconciledAt;
}`}
            </pre>
          </div>

          <p className="text-slate-500">
            Until this backend service is compiled into the Java backend, the frontend UI accurately surfaces all approved applications awaiting disbursement, maintaining complete documentation integrity.
          </p>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsContractModalOpen(false)}>
              Close Documentation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

