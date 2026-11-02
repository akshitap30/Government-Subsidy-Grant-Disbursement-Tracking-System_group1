export type VerificationStage =
  | 'INITIAL_REVIEW'
  | 'FIELD_VERIFICATION'
  | 'DISTRICT_REVIEW'
  | 'SENIOR_APPROVAL'
  | 'FINANCE_REVIEW'

export type TaskStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'ESCALATED'
  | 'CANCELLED'

export type Decision =
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN_FOR_CORRECTION'
  | 'FLAG_FOR_REVIEW'

export type EscalationLevel =
  | 'NONE'
  | 'LEVEL_1'
  | 'LEVEL_2'
  | 'LEVEL_3'

export interface TaskResponse {
  id: string
  workflowId: string
  applicationId: string
  stage: VerificationStage
  status: TaskStatus
  assignedOfficerId?: string
  assignedAt?: string
  dueAt: string
  completedAt?: string
  decision?: Decision
  comments?: string
  escalationLevel: EscalationLevel
  escalationHistory: string[]
  createdAt: string
}

export interface WorkflowResponse {
  id: string
  applicationId: string
  schemeId: string
  stages: string[]
  currentStageIndex: number
  currentStageName: string
  status: TaskStatus
  finalDecision?: Decision
  createdAt: string
  completedAt?: string
  tasks: TaskResponse[]
}

export interface CreateWorkflowRequest {
  applicationId: string
  schemeId: string
  eligibilityScore: number
  requestedAmount: number
}

export interface RecordDecisionRequest {
  decision: Decision
  comments?: string
  actorId?: string
}

