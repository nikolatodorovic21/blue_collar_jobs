export const JOB_TYPES = [
  'keramika',
  'stolarija',
  'elektrika',
  'vodoinstalater',
  'molerski_poslovi',
  'ostalo'
] as const

export type JobType = (typeof JOB_TYPES)[number]

export const JOB_TYPE_LABEL_SR: Record<JobType, string> = {
  keramika: 'Keramika',
  stolarija: 'Stolarija',
  elektrika: 'Elektrika',
  vodoinstalater: 'Vodoinstalater',
  molerski_poslovi: 'Molerski poslovi',
  ostalo: 'Ostalo'
}

export const jobTypeLabel = (key: string | undefined | null): string =>
  key && (JOB_TYPE_LABEL_SR as Record<string, string>)[key]
    ? (JOB_TYPE_LABEL_SR as Record<string, string>)[key]
    : key ?? '—'
