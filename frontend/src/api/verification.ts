import { apiClient } from './client'
import type { ApiResponse, PagedResponse } from '@/types/api'
import type {
  WorkflowResponse,
  TaskResponse,
  CreateWorkflowRequest,
  RecordDecisionRequest,
} from '@/types/verification'
import { DEMO_TASKS, DEMO_WORKFLOWS } from '@/lib/demoData'

function isDemoMode(): boolean {
  const saved = localStorage.getItem('sgdts_demo_data_mode')
  return saved !== null ? saved === 'true' : true
}

let localTasks = [...DEMO_TASKS]

export const verificationApi = {
  createWorkflow: async (data: CreateWorkflowRequest): Promise<WorkflowResponse> => {
    if (isDemoMode()) {
      return (
        DEMO_WORKFLOWS[data.applicationId] || {
          id: `demo-wf-${Date.now()}`,
          applicationId: data.applicationId,
          schemeId: data.schemeId,
          stages: ['INITIAL_REVIEW', 'FIELD_VERIFICATION', 'FINANCE_REVIEW'],
          currentStageIndex: 0,
          currentStageName: 'INITIAL_REVIEW',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          tasks: localTasks,
        }
      )
    }

    const res = await apiClient.post<ApiResponse<WorkflowResponse>>(
      '/api/v1/verification/workflows',
      data
    )
    return res.data.data
  },

  getWorkflow: async (applicationId: string): Promise<WorkflowResponse> => {
    if (isDemoMode()) {
      return (
        DEMO_WORKFLOWS[applicationId] || {
          id: `demo-wf-${applicationId}`,
          applicationId,
          schemeId: 'e1a2b3c4-0001-4000-8000-000000000001',
          stages: ['INITIAL_REVIEW', 'FIELD_VERIFICATION', 'FINANCE_REVIEW'],
          currentStageIndex: 1,
          currentStageName: 'FIELD_VERIFICATION',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          tasks: localTasks,
        }
      )
    }

    const res = await apiClient.get<ApiResponse<WorkflowResponse>>(
      `/api/v1/applications/${applicationId}/workflow`
    )
    return res.data.data
  },

  getPendingTasks: async (officerId: string, page = 0, size = 20): Promise<PagedResponse<TaskResponse>> => {
    if (isDemoMode()) {
      const filtered = localTasks.filter(
        (t) => (!t.assignedOfficerId || t.assignedOfficerId === officerId) && t.status === 'PENDING'
      )
      return {
        content: filtered.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      }
    }

    const res = await apiClient.get<ApiResponse<PagedResponse<TaskResponse>>>(
      '/api/v1/verification/tasks',
      { params: { officerId, page, size } }
    )
    return res.data.data
  },

  recordDecision: async (taskId: string, data: RecordDecisionRequest): Promise<TaskResponse> => {
    if (isDemoMode()) {
      const idx = localTasks.findIndex((t) => t.id === taskId)
      if (idx !== -1) {
        localTasks[idx] = {
          ...localTasks[idx],
          decision: data.decision,
          comments: data.comments,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        }
        return localTasks[idx]
      }
      throw new Error('Task not found')
    }

    const res = await apiClient.post<ApiResponse<TaskResponse>>(
      `/api/v1/verification/tasks/${taskId}/decisions`,
      data
    )
    return res.data.data
  },

  reassignTask: async (taskId: string, officerId: string): Promise<TaskResponse> => {
    if (isDemoMode()) {
      const idx = localTasks.findIndex((t) => t.id === taskId)
      if (idx !== -1) {
        localTasks[idx] = {
          ...localTasks[idx],
          assignedOfficerId: officerId,
          assignedAt: new Date().toISOString(),
        }
        return localTasks[idx]
      }
      throw new Error('Task not found')
    }

    const res = await apiClient.post<ApiResponse<TaskResponse>>(
      `/api/v1/verification/tasks/${taskId}/reassign`,
      null,
      { params: { officerId } }
    )
    return res.data.data
  },
}
