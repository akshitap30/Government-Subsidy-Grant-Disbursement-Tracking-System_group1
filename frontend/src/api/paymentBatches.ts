import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

export type StageStatus = 'SCHEDULED' | 'READY' | 'ON_HOLD' | 'PROCESSING' | 'DISBURSED' | 'FAILED' | 'CANCELLED'
export type BatchStatus = 'DRAFT' | 'VALIDATED' | 'PROCESSING' | 'PARTIALLY_PROCESSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export interface Stage { id: string; planId: string; stageNumber: number; stageName: string; amount: number; scheduledDate?: string; status: StageStatus; releasedAt?: string }
export interface Plan { id: string; applicationId: string; totalSanctionedAmount: number; planStatus: string; stages?: Stage[] }
export interface PaymentJob { id: string; stageId: string; applicationId: string; beneficiaryId: string; amount: number; status: string; attemptCount: number; transactionReference?: string; gatewayMessage?: string; processedAt?: string }
export interface PaymentBatch { id: string; batchReference: string; status: BatchStatus; totalAmount: number; paymentCount: number; successfulPayments: number; failedPayments: number; createdAt: string; processedAt?: string; payments: PaymentJob[] }

async function data<T>(promise: Promise<{data: ApiResponse<T>}>): Promise<T> { return (await promise).data.data }
export const paymentBatchesApi = {
  list: () => data(apiClient.get<ApiResponse<PaymentBatch[]>>('/api/v1/payment-batches')),
  create: (stageIds: string[]) => data(apiClient.post<ApiResponse<PaymentBatch>>('/api/v1/payment-batches', { stageIds })),
  validate: (id: string) => data(apiClient.post<ApiResponse<PaymentBatch>>(`/api/v1/payment-batches/${id}/validate`)),
  process: (id: string) => data(apiClient.post<ApiResponse<PaymentBatch>>(`/api/v1/payment-batches/${id}/process`)),
  retry: (jobId: string) => data(apiClient.post<ApiResponse<PaymentBatch>>(`/api/v1/payment-jobs/${jobId}/retry`)),
  getPlan: (applicationId: string) => data(apiClient.get<ApiResponse<Plan>>(`/api/v1/applications/${applicationId}/disbursement-plan`)),
  createPlan: (applicationId: string) => data(apiClient.post<ApiResponse<Plan>>('/api/v1/disbursement-plans', { applicationId, createdBy: 'Finance Admin' })),
  addStage: (planId: string, stageNumber: number, stageName: string, amount: number, scheduledDate?: string) => data(apiClient.post<ApiResponse<Stage>>(`/api/v1/disbursement-plans/${planId}/stages`, { stageNumber, stageName, amount, scheduledDate })),
  activatePlan: (id: string) => data(apiClient.post<ApiResponse<Plan>>(`/api/v1/disbursement-plans/${id}/activate`)),
  prepareStage: (id: string) => data(apiClient.post<ApiResponse<Stage>>(`/api/v1/disbursement-stages/${id}/prepare`)),
}
