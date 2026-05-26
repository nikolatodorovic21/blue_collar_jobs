import axios from 'axios'
import type { EstimatedDuration, JobStatus } from '@/types'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

const readCsrfCookie = (): string | null => {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = readCsrfCookie()
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as Record<string, string>)['X-CSRF-Token'] = token
    }
  }
  return config
})

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler
}

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  }
)

// Job endpoints
export const getJobs = () => api.get('/jobs')
export const getJobById = (id: string) => api.get(`/jobs/${id}`)
export const addJob = (jobData: { type: string; price: number; location: string; description: string }) =>
  api.post('/jobs', jobData)

export const updateJobStatus = (
  jobId: string,
  body: { status: JobStatus; reason?: string }
) => api.patch(`/jobs/${jobId}/status`, body)

// Bid endpoints
export interface BidPayload {
  amount: number
  message?: string
  proposedDate?: string
  estimatedDuration?: EstimatedDuration
}

export const submitBid = (jobId: string, body: BidPayload) =>
  api.post(`/jobs/${jobId}/bids`, body)

export const getBidsForJob = (jobId: string) => api.get(`/jobs/${jobId}/bids`)

export const getMyBids = () => api.get('/bids')

export const acceptBid = (bidId: string) => api.patch(`/bids/${bidId}/accept`)

export const editBid = (bidId: string, body: Partial<BidPayload>) =>
  api.patch(`/bids/${bidId}`, body)

export const withdrawBid = (bidId: string) =>
  api.patch(`/bids/${bidId}/withdraw`)

// User profile + reviews
export const getPublicUser = (id: string) => api.get(`/users/${id}`)

export const createReview = (body: { jobId: string; rating: number; comment?: string }) =>
  api.post('/reviews', body)

export const listReviews = (userId: string) =>
  api.get('/reviews', { params: { userId } })

export default api
