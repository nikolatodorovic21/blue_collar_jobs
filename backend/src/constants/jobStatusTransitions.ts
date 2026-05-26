import type { JobStatus } from '../models/job.model';

export type TransitionActor = 'client' | 'worker' | 'either' | 'system' | 'admin';

export interface JobStatusTransition {
  from: JobStatus;
  to: JobStatus;
  actor: TransitionActor;
  requiresReason?: boolean;
}

export const JOB_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'closed',
  'disputed'
] as const satisfies readonly JobStatus[];

export const JOB_STATUS_TRANSITIONS: readonly JobStatusTransition[] = [
  { from: 'open', to: 'assigned', actor: 'client' },
  { from: 'open', to: 'cancelled', actor: 'client', requiresReason: true },
  { from: 'open', to: 'closed', actor: 'system' },
  { from: 'assigned', to: 'in_progress', actor: 'worker' },
  { from: 'assigned', to: 'cancelled', actor: 'either', requiresReason: true },
  { from: 'in_progress', to: 'completed', actor: 'client' },
  { from: 'in_progress', to: 'disputed', actor: 'either', requiresReason: true },
  { from: 'disputed', to: 'closed', actor: 'admin' }
] as const;

export const findTransition = (
  from: JobStatus,
  to: JobStatus
): JobStatusTransition | undefined =>
  JOB_STATUS_TRANSITIONS.find((t) => t.from === from && t.to === to);
