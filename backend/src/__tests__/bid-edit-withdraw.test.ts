import { describe, it, expect } from 'vitest';
import { Bid } from '../models/bid.model';
import { Job } from '../models/job.model';
import {
  acceptBid,
  createJob,
  registerAndLogin,
  submitBid,
  withCsrf
} from './helpers';

const id = (entity: { id?: string; _id?: string }) => (entity.id ?? entity._id)!;

describe('Bid edit / withdraw', () => {
  it('worker edits own pending bid → 200, amount updated', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job), { amount: 9000 });

    const res = await withCsrf(
      worker.agent.patch(`/api/bids/${id(bid)}`),
      worker.csrfToken
    ).send({ amount: 11000, message: 'Promenjena ponuda' });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(11000);
    expect(res.body.message).toBe('Promenjena ponuda');
  });

  it('worker cannot edit a non-pending bid (409)', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job));
    await acceptBid(client, id(bid));

    const res = await withCsrf(
      worker.agent.patch(`/api/bids/${id(bid)}`),
      worker.csrfToken
    ).send({ amount: 12000 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Ponuda se više ne može menjati');
  });

  it('other worker cannot edit (403)', async () => {
    const client = await registerAndLogin('client');
    const workerA = await registerAndLogin('worker');
    const workerB = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(workerA, id(job));

    const res = await withCsrf(
      workerB.agent.patch(`/api/bids/${id(bid)}`),
      workerB.csrfToken
    ).send({ amount: 9999 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Možete menjati samo svoje ponude');
  });

  it('worker withdraws own pending bid → 200, status withdrawn', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job));

    const res = await withCsrf(
      worker.agent.patch(`/api/bids/${id(bid)}/withdraw`),
      worker.csrfToken
    ).send();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('withdrawn');
  });

  it('worker cannot withdraw a non-pending bid (409)', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    const bid = await submitBid(worker, id(job));
    await acceptBid(client, id(bid));

    const res = await withCsrf(
      worker.agent.patch(`/api/bids/${id(bid)}/withdraw`),
      worker.csrfToken
    ).send();

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Ponuda se više ne može povući');
  });

  it('pending-bid cap: 11th pending bid by same worker returns 409', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');

    for (let i = 0; i < 10; i++) {
      const job = await createJob(client, { description: `Posao ${i}` });
      await submitBid(worker, id(job), { amount: 1000 + i });
    }

    const finalJob = await createJob(client, { description: 'Posao 11' });
    const res = await withCsrf(
      worker.agent.post(`/api/jobs/${id(finalJob)}/bids`),
      worker.csrfToken
    ).send({ amount: 12000 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Dostigli ste maksimalan broj aktivnih ponuda (10).');

    const pendingCount = await Bid.countDocuments({ workerId: worker.user.id, status: 'pending' });
    expect(pendingCount).toBe(10);
  });

  it('amount min/max guards reject out-of-range bids', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);

    const tooLow = await withCsrf(
      worker.agent.post(`/api/jobs/${id(job)}/bids`),
      worker.csrfToken
    ).send({ amount: 0 });
    expect(tooLow.status).toBe(400);
    expect(tooLow.body.errors.amount).toMatch(/najmanje/);

    const tooHigh = await withCsrf(
      worker.agent.post(`/api/jobs/${id(job)}/bids`),
      worker.csrfToken
    ).send({ amount: 999_999_999 });
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.body.errors.amount).toMatch(/prelaziti/);
  });

  it('HTML in bid message is stripped on write', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);

    const res = await withCsrf(
      worker.agent.post(`/api/jobs/${id(job)}/bids`),
      worker.csrfToken
    ).send({ amount: 9000, message: '<script>alert(1)</script>Mogu odmah' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Mogu odmah');

    const stored = await Bid.findById(id(res.body));
    expect(stored!.message).toBe('Mogu odmah');

    void Job;
  });
});
