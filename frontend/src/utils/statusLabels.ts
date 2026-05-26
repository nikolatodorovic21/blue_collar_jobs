import type { BidStatus, JobStatus } from '@/types'

export const jobStatusLabel = (s: JobStatus): string =>
  ({
    open: 'Otvoren',
    assigned: 'Dodeljen',
    in_progress: 'U toku',
    completed: 'Završen',
    cancelled: 'Otkazan',
    closed: 'Zatvoren',
    disputed: 'U sporu'
  } as const)[s]

export const jobStatusBadge = (s: JobStatus): string => {
  const base = 'badge '
  switch (s) {
    case 'open':
      return base + 'bg-warning text-dark'
    case 'assigned':
      return base + 'bg-success'
    case 'in_progress':
      return base + 'bg-info text-dark'
    case 'completed':
      return base + 'bg-secondary'
    case 'cancelled':
      return base + 'bg-danger'
    case 'disputed':
      return base + 'bg-danger'
    case 'closed':
    default:
      return base + 'bg-dark'
  }
}

export const bidStatusLabel = (s: BidStatus): string =>
  ({
    pending: 'Na čekanju',
    accepted: 'Prihvaćena',
    rejected: 'Odbijena',
    withdrawn: 'Povučena',
    expired: 'Istekla'
  } as const)[s]

export const bidStatusBadge = (s: BidStatus): string => {
  const base = 'badge '
  switch (s) {
    case 'accepted':
      return base + 'bg-success'
    case 'rejected':
      return base + 'bg-danger'
    case 'withdrawn':
      return base + 'bg-secondary'
    case 'expired':
      return base + 'bg-dark'
    case 'pending':
    default:
      return base + 'bg-warning text-dark'
  }
}
