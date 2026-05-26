export type JobStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'closed'
  | 'disputed'

export type { JobType } from '@/constants/jobTypes'
import type { JobType } from '@/constants/jobTypes'

export type BidStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export type DurationUnit = 'hours' | 'days'

export interface EstimatedDuration {
  value: number
  unit: DurationUnit
}

export interface Job {
  id: string
  type: JobType
  price: number
  location: string
  description: string
  status: JobStatus
  userId: string
  assignedWorkerId?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  cancelledAt?: string | null
  cancelReason?: string | null
  expiresAt?: string | null
}

export interface Bid {
  id: string
  jobId: string | { id: string; type: string; price: number; location?: string; status?: JobStatus }
  workerId: string | { id: string; name: string; email?: string }
  amount: number
  message: string
  status: BidStatus
  createdAt: string
  updatedAt: string
  proposedDate?: string | null
  estimatedDuration?: EstimatedDuration | null
}

export interface User {
  id: string
  email: string
  name: string
  role: 'worker' | 'client'
  skills?: string[]
  address?: string
}

export interface Review {
  id: string
  jobId: string | { id: string; type: string }
  reviewerId: string | { id: string; name: string; role: 'worker' | 'client' }
  revieweeId: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

export interface PublicUser {
  id: string
  name: string
  role: 'worker' | 'client'
  skills: string[]
  rating: { average: number | null; count: number }
}
