import { describe, it, expect } from 'vitest';
import {
  acceptBid,
  createJob,
  registerAndLogin,
  submitBid,
  transitionJobStatus,
  withCsrf
} from './helpers';

describe('POST /api/reviews', () => {
  it('happy path: client reviews worker after completed lifecycle', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');

    const job = await createJob(client);
    const jobId = job.id ?? job._id;
    const bid = await submitBid(worker, jobId);
    await acceptBid(client, bid.id ?? bid._id);
    await transitionJobStatus(worker, jobId, 'in_progress');
    await transitionJobStatus(client, jobId, 'completed');

    const createRes = await withCsrf(
      client.agent.post('/api/reviews'),
      client.csrfToken
    ).send({ jobId, rating: 5, comment: 'Odličan majstor' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.rating).toBe(5);
    expect(createRes.body.comment).toBe('Odličan majstor');
    expect(String(createRes.body.reviewerId)).toBe(client.user.id);
    expect(String(createRes.body.revieweeId)).toBe(worker.user.id);

    const listRes = await client.agent.get('/api/reviews').query({ userId: worker.user.id });
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].rating).toBe(5);

    const profileRes = await client.agent.get(`/api/users/${worker.user.id}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.rating).toEqual({ average: 5, count: 1 });
    expect(profileRes.body.skills).toEqual([]);
    expect(profileRes.body.role).toBe('worker');
    expect(profileRes.body).not.toHaveProperty('password');
    expect(profileRes.body).not.toHaveProperty('email');
  });

  it('409 when the job is not completed', async () => {
    const client = await registerAndLogin('client');
    const worker = await registerAndLogin('worker');

    const job = await createJob(client);
    const jobId = job.id ?? job._id;
    const bid = await submitBid(worker, jobId);
    await acceptBid(client, bid.id ?? bid._id);
    // Skip the in_progress + completed transitions — job stays in 'assigned'.

    const res = await withCsrf(
      client.agent.post('/api/reviews'),
      client.csrfToken
    ).send({ jobId, rating: 4, comment: 'Prerano' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Recenzija je moguća tek kada je posao završen');
  });
});
