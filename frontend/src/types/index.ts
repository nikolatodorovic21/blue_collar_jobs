export type JobStatus = 'open' | 'assigned' | 'completed' | 'closed'
export type BidStatus = 'pending' | 'accepted' | 'rejected'

export interface Job {
  id: string
  type: string
  price: number
  location: string
  description: string
  status: JobStatus
  userId: string
  assignedWorkerId?: string | null
  createdAt: string
  updatedAt: string
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
}

export interface User {
  id: string
  email: string
  name: string
  role: 'worker' | 'client'
  skills?: string[]
  address?: string
}
