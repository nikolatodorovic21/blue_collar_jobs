import { describe, it, expect } from 'vitest';
import { Job } from '../models/job.model';
import {
  createJob,
  registerAndLogin,
  submitBid,
  unauthedRequest,
  withCsrf
} from './helpers';

const id = (entity: { id?: string; _id?: string }) => (entity.id ?? entity._id)!;

describe('Auth boundary — 401/403', () => {
  it('request with no cookies is blocked by CSRF (403) before reaching auth', async () => {
    const res = await unauthedRequest()
      .post('/api/jobs')
      .send({ type: 'keramika', price: 10000, location: 'Beograd', description: 'X' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('CSRF token nije validan');
  });

  it('worker POST /api/jobs returns 403 (requireRole client)', async () => {
    const worker = await registerAndLogin('worker');
    const res = await withCsrf(worker.agent.post('/api/jobs'), worker.csrfToken).send({
      type: 'keramika',
      price: 10000,
      location: 'Beograd',
      description: 'X'
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Samo klijenti mogu izvršiti ovu radnju');
  });

  it('client POST /api/jobs/:id/bids returns 403 (requireRole worker)', async () => {
    const clientA = await registerAndLogin('client');
    const clientB = await registerAndLogin('client');
    const job = await createJob(clientA);
    const res = await withCsrf(
      clientB.agent.post(`/api/jobs/${id(job)}/bids`),
      clientB.csrfToken
    ).send({ amount: 9000 });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Samo majstori mogu izvršiti ovu radnju');
  });

  it('worker bidding on own job returns 403', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');
    const job = await createJob(client);
    await Job.updateOne({ _id: id(job) }, { userId: worker.user.id });

    const res = await withCsrf(
      worker.agent.post(`/api/jobs/${id(job)}/bids`),
      worker.csrfToken
    ).send({ amount: 9000 });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Ne možete dati ponudu na sopstveni posao');
  });

  it('non-owner client cannot accept a bid (403)', async () => {
    const ownerClient = await registerAndLogin('client');
    const otherClient = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');

    const job = await createJob(ownerClient);
    const bid = await submitBid(worker, id(job));

    const res = await withCsrf(
      otherClient.agent.patch(`/api/bids/${id(bid)}/accept`),
      otherClient.csrfToken
    ).send();
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Samo vlasnik posla može prihvatiti ponudu');
  });

  it('sneaky userId in POST /api/jobs body is dropped; job persisted under cookie identity', async () => {
    const client = await registerAndLogin('client');
    const otherClient = await registerAndLogin('client');

    const res = await withCsrf(client.agent.post('/api/jobs'), client.csrfToken).send({
      type: 'keramika',
      price: 8000,
      location: 'Beograd',
      description: 'Test',
      userId: otherClient.user.id,
      role: 'worker'
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Neispravni podaci');
    expect(res.body.errors._).toMatch(/Unrecognized key/);
  });
});
