import { describe, it, expect } from 'vitest';
import { Bid } from '../models/bid.model';
import { Job } from '../models/job.model';
import {
  acceptBid,
  createJob,
  deleteJob,
  registerAndLogin,
  submitBid,
  transitionJobStatus,
  withCsrf
} from './helpers';

const id = (entity: { id?: string; _id?: string }) => (entity.id ?? entity._id)!;

describe('DELETE /api/jobs/:id (soft-cancel)', () => {
  it('owner deletes open job → 200, status cancelled with default reason; pending bids cascade to expired', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job));

    const res = await deleteJob(client, id(job));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.cancelReason).toBe('Obrisano od strane vlasnika');
    expect(res.body.cancelledAt).toBeTruthy();

    const dbBid = await Bid.findById(id(bid));
    expect(dbBid!.status).toBe('expired');
  });

  it('owner deletes with explicit reason → cancelReason stored', async () => {
    const client = await registerAndLogin('client');
    const job = await createJob(client);

    const res = await deleteJob(client, id(job), 'Promenio sam plan');
    expect(res.status).toBe(200);
    expect(res.body.cancelReason).toBe('Promenio sam plan');
  });

  it('owner deletes with HTML in reason → reason is sanitized', async () => {
    const client = await registerAndLogin('client');
    const job = await createJob(client);

    const res = await deleteJob(client, id(job), '<b>Promenio</b> sam plan');
    expect(res.status).toBe(200);
    expect(res.body.cancelReason).toBe('Promenio sam plan');
  });

  it('DELETE on already-cancelled job → 409', async () => {
    const client = await registerAndLogin('client');
    const job = await createJob(client);
    await deleteJob(client, id(job));

    const res = await deleteJob(client, id(job));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Nedozvoljena promena statusa');
  });

  it('DELETE by non-owner client → 403', async () => {
    const owner = await registerAndLogin('client');
    const other = await registerAndLogin('client');
    const job = await createJob(owner);

    const res = await deleteJob(other, id(job));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Nemate dozvolu za ovu promenu statusa');
  });

  it('worker can cancel assigned job (either-actor transition)', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job));
    await acceptBid(client, id(bid));

    const res = await deleteJob(worker, id(job));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });
});

describe('Worker happy-path status transition assigned → in_progress', () => {
  it('assigned worker can mark job in_progress', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job));
    await acceptBid(client, id(bid));

    const updated = await transitionJobStatus(worker, id(job), 'in_progress');
    expect(updated.status).toBe('in_progress');

    const dbJob = await Job.findById(id(job));
    expect(dbJob!.status).toBe('in_progress');
  });

  it('non-assigned worker cannot mark another worker\'s job in_progress (403)', async () => {
    const client = await registerAndLogin('client');
    const workerA = await registerAndLogin('worker');
    const workerB = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(workerA, id(job));
    await acceptBid(client, id(bid));

    const res = await withCsrf(
      workerB.agent.patch(`/api/jobs/${id(job)}/status`),
      workerB.csrfToken
    ).send({ status: 'in_progress' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Nemate dozvolu za ovu promenu statusa');
  });
});
