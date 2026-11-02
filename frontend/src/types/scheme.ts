export type CriterionType =
  | 'NUMERIC_MIN'
  | 'NUMERIC_MAX'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'BOOLEAN'
  | 'ENUM_MATCH'
  | 'REQUIRED'

export type SchemeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export interface CriterionDto {
  criterionId: string
  type: CriterionType
  expectedValue?: string
  weight: number
  mandatory: boolean
  description?: string
}

export interface RoutingRuleDto {
  minScore: number
  maxScore: number
  minGrantAmount?: number
  maxGrantAmount?: number
  stages: string[]
}

export interface SchemeResponse {
  id: string
  name: string
  description: string
  status: SchemeStatus
  minGrantAmount: number
  maxGrantAmount: number
  configVersion: number
  criteria: CriterionDto[]
  routingRules: RoutingRuleDto[]
  createdAt: string
  updatedAt: string
}

export interface CreateSchemeRequest {
  name: string
  description?: string
  minGrantAmount: number
  maxGrantAmount: number
  criteria?: CriterionDto[]
  routingRules?: RoutingRuleDto[]
}

export interface UpdateSchemeRequest {
  name?: string
  description?: string
  minGrantAmount?: number
  maxGrantAmount?: number
  criteria?: CriterionDto[]
  routingRules?: RoutingRuleDto[]
}

