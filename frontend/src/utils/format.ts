import type { EstimatedDuration } from '@/types'

const dateFmt = new Intl.DateTimeFormat('sr-RS', { dateStyle: 'medium' })

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return dateFmt.format(d)
}

export const formatDuration = (d?: EstimatedDuration | null): string => {
  if (!d) return '—'
  if (d.unit === 'hours') {
    if (d.value === 1) return '1 sat'
    if (d.value >= 2 && d.value <= 4) return `${d.value} sata`
    return `${d.value} sati`
  }
  if (d.value === 1) return '1 dan'
  return `${d.value} dana`
}

export const isEdited = (createdAt?: string, updatedAt?: string): boolean => {
  if (!createdAt || !updatedAt) return false
  const c = new Date(createdAt).getTime()
  const u = new Date(updatedAt).getTime()
  return u - c > 1000
}
