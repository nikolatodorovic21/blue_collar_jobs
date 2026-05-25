import axios from 'axios'

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

// Bid endpoints
export const submitBid = (
  jobId: string,
  body: { amount: number; message?: string }
) => api.post(`/jobs/${jobId}/bids`, body)

export const getBidsForJob = (jobId: string) => api.get(`/jobs/${jobId}/bids`)

export const getMyBids = () => api.get('/bids')

export const acceptBid = (bidId: string) => api.patch(`/bids/${bidId}/accept`)

export default api
