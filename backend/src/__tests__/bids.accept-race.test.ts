import { describe, it, expect } from 'vitest';
import { Bid } from '../models/bid.model';
import { Job } from '../models/job.model';
import {
  createJob,
  registerAndLogin,
  submitBid,
  withCsrf
} from './helpers';

describe('PATCH /api/bids/:id/accept — concurrent accept on the same job', () => {
  it('exactly one accept returns 200, the other returns 409; job + bid statuses consistent', async () => {
    const client = await registerAndLogin('client');
    const workerA = await registerAndLogin('worker');
    const workerB = await registerAndLogin('worker');

    const job = await createJob(client);
    const bidA = await submitBid(workerA, job.id ?? job._id, { amount: 9000 });
    const bidB = await submitBid(workerB, job.id ?? job._id, { amount: 9500 });

    const acceptA = withCsrf(
      client.agent.patch(`/api/bids/${bidA.id ?? bidA._id}/accept`),
      client.csrfToken
    ).send();
    const acceptB = withCsrf(
      client.agent.patch(`/api/bids/${bidB.id ?? bidB._id}/accept`),
      client.csrfToken
    ).send();

    const [resA, resB] = await Promise.all([acceptA, acceptB]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = resA.status === 200 ? resA : resB;
    const loser = resA.status === 409 ? resA : resB;
    expect(loser.body.message).toBe('Posao više nije otvoren za ponude');

    const dbJob = await Job.findById(job.id ?? job._id);
    expect(dbJob).toBeTruthy();
    expect(dbJob!.status).toBe('assigned');
    expect(dbJob!.assignedWorkerId?.toString()).toBe(
      String(winner.body.workerId)
    );

    const acceptedBids = await Bid.find({ jobId: dbJob!._id, status: 'accepted' });
    expect(acceptedBids).toHaveLength(1);
    expect(acceptedBids[0]._id.toString()).toBe(String(winner.body.id ?? winner.body._id));

    const rejectedBids = await Bid.find({ jobId: dbJob!._id, status: 'rejected' });
    expect(rejectedBids).toHaveLength(1);

    const winnerId = String(winner.body.id ?? winner.body._id);
    const loserBidId = winnerId === String(bidA.id ?? bidA._id)
      ? String(bidB.id ?? bidB._id)
      : String(bidA.id ?? bidA._id);
    expect(rejectedBids[0]._id.toString()).toBe(loserBidId);
  });
});
