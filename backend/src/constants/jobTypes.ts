export const JOB_TYPES = [
  'keramika',
  'stolarija',
  'elektrika',
  'vodoinstalater',
  'molerski_poslovi',
  'ostalo'
] as const;

export type JobType = (typeof JOB_TYPES)[number];
