import React from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  Ban,
  ShieldAlert,
} from 'lucide-react'

export interface StatusBadgeProps {
  status: string
  type?: 'application' | 'scheme' | 'profile' | 'task' | 'outcome' | 'decision'
  size?: 'sm' | 'md'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'application' }) => {
  if (!status) return <Badge variant="outline">N/A</Badge>

  const normalized = status.toUpperCase().trim()

  switch (normalized) {
    // Application & Workflow states
    case 'APPROVED':
      return (
        <Badge variant="success">
          <CheckCircle className="h-3 w-3" />
          <span>Approved</span>
        </Badge>
      )
    case 'REJECTED':
      return (
        <Badge variant="danger">
          <XCircle className="h-3 w-3" />
          <span>Rejected</span>
        </Badge>
      )
    case 'INELIGIBLE':
      return (
        <Badge variant="danger">
          <XCircle className="h-3 w-3" />
          <span>Ineligible</span>
        </Badge>
      )
    case 'ELIGIBLE':
      return (
        <Badge variant="success">
          <CheckCircle className="h-3 w-3" />
          <span>Eligible</span>
        </Badge>
      )
    case 'INCOMPLETE':
      return (
        <Badge variant="warning">
          <AlertTriangle className="h-3 w-3" />
          <span>Incomplete</span>
        </Badge>
      )
    case 'DRAFT':
      return (
        <Badge variant="default">
          <Clock className="h-3 w-3" />
          <span>Draft</span>
        </Badge>
      )
    case 'SUBMITTED':
      return (
        <Badge variant="info">
          <FileCheck className="h-3 w-3" />
          <span>Submitted</span>
        </Badge>
      )
    case 'ELIGIBILITY_REVIEW':
      return (
        <Badge variant="purple">
          <Clock className="h-3 w-3" />
          <span>Eligibility Review</span>
        </Badge>
      )
    case 'UNDER_VERIFICATION':
    case 'PENDING':
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3" />
          <span>{normalized === 'PENDING' ? 'Pending' : 'Under Verification'}</span>
        </Badge>
      )
    case 'RETURNED_FOR_CORRECTION':
      return (
        <Badge variant="warning">
          <RotateCcw className="h-3 w-3" />
          <span>Returned for Correction</span>
        </Badge>
      )
    case 'CANCELLED':
      return (
        <Badge variant="outline">
          <Ban className="h-3 w-3" />
          <span>Cancelled</span>
        </Badge>
      )
    case 'ACTIVE':
      return (
        <Badge variant="success">
          <CheckCircle className="h-3 w-3" />
          <span>Active</span>
        </Badge>
      )
    case 'INACTIVE':
      return (
        <Badge variant="outline">
          <span>Inactive</span>
        </Badge>
      )
    case 'SUSPENDED':
      return (
        <Badge variant="danger">
          <Ban className="h-3 w-3" />
          <span>Suspended</span>
        </Badge>
      )
    case 'COMPLETED':
      return (
        <Badge variant="success">
          <CheckCircle className="h-3 w-3" />
          <span>Completed</span>
        </Badge>
      )
    case 'ESCALATED':
      return (
        <Badge variant="danger">
          <ShieldAlert className="h-3 w-3" />
          <span>Escalated</span>
        </Badge>
      )
    case 'FLAG_FOR_REVIEW':
      return (
        <Badge variant="purple">
          <AlertTriangle className="h-3 w-3" />
          <span>Flagged for Review</span>
        </Badge>
      )
    default:
      return (
        <Badge variant="default">
          <span>{status.replace(/_/g, ' ')}</span>
        </Badge>
      )
  }
}

