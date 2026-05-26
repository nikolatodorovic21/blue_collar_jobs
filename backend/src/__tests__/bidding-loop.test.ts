import { describe, it, expect } from 'vitest';
import { Bid } from '../models/bid.model';
import { Job } from '../models/job.model';
import {
  acceptBid,
  createJob,
  registerAndLogin,
  submitBid
} from './helpers';

const id = (entity: { id?: string; _id?: string }) => (entity.id ?? entity._id)!;

describe('Bidding loop — happy path end to end', () => {
  it('register → post → bid → accept transitions job to assigned and bids to accepted/rejected', async () => {
    const client = await registerAndLogin('client');
    const workerA = await registerAndLogin('worker');
    const workerB = await registerAndLogin('worker');

    const job = await createJob(client, {
      type: 'keramika',
      price: 12000,
      location: 'Beograd',
      description: 'Postavljanje pločica u kupatilu'
    });
    expect(job.status).toBe('open');
    expect(String(job.userId)).toBe(client.user.id);

    const bidA = await submitBid(workerA, id(job), { amount: 11000, message: 'Mogu u subotu' });
    const bidB = await submitBid(workerB, id(job), { amount: 9500, message: 'Mogu odmah' });
    expect(bidA.status).toBe('pending');
    expect(bidB.status).toBe('pending');

    const winner = await acceptBid(client, id(bidB));
    expect(winner.status).toBe('accepted');
    expect(String(winner._id ?? winner.id)).toBe(id(bidB));

    const dbJob = await Job.findById(id(job));
    expect(dbJob).toBeTruthy();
    expect(dbJob!.status).toBe('assigned');
    expect(String(dbJob!.assignedWorkerId)).toBe(workerB.user.id);

    const sibling = await Bid.findById(id(bidA));
    expect(sibling).toBeTruthy();
    expect(sibling!.status).toBe('rejected');
  });

  it('worker sees only own bids via GET /api/bids', async () => {
    const client = await registerAndLogin('client');
    const workerA = await registerAndLogin('worker');
    const workerB = await registerAndLogin('worker');

    const job1 = await createJob(client);
    const job2 = await createJob(client);
    await submitBid(workerA, id(job1));
    await submitBid(workerB, id(job2));

    const aRes = await workerA.agent.get('/api/bids');
    expect(aRes.status).toBe(200);
    expect(aRes.body).toHaveLength(1);
    expect(String(aRes.body[0].workerId._id ?? aRes.body[0].workerId)).toBe(workerA.user.id);

    const aSpoofRes = await workerA.agent.get('/api/bids').query({ workerId: workerB.user.id });
    expect(aSpoofRes.status).toBe(200);
    expect(aSpoofRes.body).toHaveLength(1);
    expect(String(aSpoofRes.body[0].workerId._id ?? aSpoofRes.body[0].workerId)).toBe(workerA.user.id);
  });

  it('job owner sees all bids; non-owner sees only their own', async () => {
    const client = await registerAndLogin('client');
    const workerA = await registerAndLogin('worker');
    const workerB = await registerAndLogin('worker');

    const job = await createJob(client);
    await submitBid(workerA, id(job));
    await submitBid(workerB, id(job));

    const ownerView = await client.agent.get(`/api/jobs/${id(job)}/bids`);
    expect(ownerView.status).toBe(200);
    expect(ownerView.body).toHaveLength(2);

    const bidderView = await workerA.agent.get(`/api/jobs/${id(job)}/bids`);
    expect(bidderView.status).toBe(200);
    expect(bidderView.body).toHaveLength(1);
    expect(String(bidderView.body[0].workerId._id ?? bidderView.body[0].workerId)).toBe(workerA.user.id);
  });
});
