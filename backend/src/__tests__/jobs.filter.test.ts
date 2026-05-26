import { describe, it, expect } from 'vitest';
import { Job } from '../models/job.model';
import { createJob, registerAndLogin, transitionJobStatus } from './helpers';
import request from 'supertest';
import app from '../app';

const fetchJobs = (params: Record<string, string | number> = {}) =>
  request(app).get('/api/jobs').query(params);

describe('GET /api/jobs — filter + cursor pagination', () => {
  it('no filters: returns all jobs (no implicit status default)', async () => {
    const client = await registerAndLogin('client');
    await createJob(client, { type: 'keramika', price: 8000, location: 'Beograd' });
    await createJob(client, { type: 'stolarija', price: 12000, location: 'Novi Sad' });

    const res = await fetchJobs();
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.nextCursor).toBeNull();
  });

  it('filters by type', async () => {
    const client = await registerAndLogin('client');
    await createJob(client, { type: 'keramika' });
    await createJob(client, { type: 'stolarija' });
    await createJob(client, { type: 'elektrika' });

    const res = await fetchJobs({ type: 'stolarija' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe('stolarija');
  });

  it('filters by status (e.g. open vs cancelled)', async () => {
    const client = await registerAndLogin('client');
    const open = await createJob(client);
    const toCancel = await createJob(client);
    await transitionJobStatus(client, toCancel.id ?? toCancel._id, 'cancelled', 'promenio sam plan');

    const res = await fetchJobs({ status: 'open' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id ?? res.body.items[0]._id).toBe(open.id ?? open._id);
  });

  it('filters by location substring, case-insensitive', async () => {
    const client = await registerAndLogin('client');
    await createJob(client, { location: 'Novi Sad' });
    await createJob(client, { location: 'Beograd' });

    const res = await fetchJobs({ location: 'novi' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].location).toBe('Novi Sad');
  });

  it('filters by price range', async () => {
    const client = await registerAndLogin('client');
    await createJob(client, { price: 3000 });
    await createJob(client, { price: 10000 });
    await createJob(client, { price: 25000 });

    const res = await fetchJobs({ priceMin: 5000, priceMax: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].price).toBe(10000);
  });

  it('AND-composes filters', async () => {
    const client = await registerAndLogin('client');
    await createJob(client, { type: 'keramika', price: 8000 });
    await createJob(client, { type: 'keramika', price: 25000 });
    await createJob(client, { type: 'stolarija', price: 8000 });

    const res = await fetchJobs({ type: 'keramika', priceMax: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe('keramika');
    expect(res.body.items[0].price).toBe(8000);
  });

  it('cursor pagination walks the full set without duplicates', async () => {
    const client = await registerAndLogin('client');
    for (let i = 0; i < 5; i++) {
      // Force distinct createdAt timestamps so the sort is deterministic.
      // eslint-disable-next-line no-await-in-loop
      await createJob(client, { price: 1000 + i });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 5));
    }

    const seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 4; page++) {
      const params: Record<string, string | number> = { limit: 2 };
      if (cursor) params.cursor = cursor;
      // eslint-disable-next-line no-await-in-loop
      const res = await fetchJobs(params);
      expect(res.status).toBe(200);
      for (const item of res.body.items) {
        seen.add(String(item.id ?? item._id));
      }
      if (!res.body.nextCursor) break;
      cursor = res.body.nextCursor;
    }
    expect(seen.size).toBe(5);
  });

  it('rejects unknown type with 400', async () => {
    const res = await fetchJobs({ type: 'spaceship' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Neispravni podaci');
  });

  it('rejects priceMin > priceMax with Serbian message', async () => {
    const res = await fetchJobs({ priceMin: 99999, priceMax: 1 });
    expect(res.status).toBe(400);
    expect(res.body.errors?.priceMin).toBe('priceMin ne sme biti veći od priceMax');
  });

  it('rejects malformed cursor with 400', async () => {
    const res = await fetchJobs({ cursor: 'not-a-real-cursor' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Nevažeći cursor');
  });

  it('lazy expiry sweep moves past-expiresAt open jobs to closed before filtering', async () => {
    const client = await registerAndLogin('client');
    const fresh = await createJob(client);
    const stale = await createJob(client);
    // Backdate the second job's expiresAt by direct write (we don't expose that via the API).
    await Job.updateOne(
      { _id: stale.id ?? stale._id },
      { expiresAt: new Date(Date.now() - 60_000) }
    );

    const openRes = await fetchJobs({ status: 'open' });
    expect(openRes.status).toBe(200);
    expect(openRes.body.items).toHaveLength(1);
    expect(openRes.body.items[0].id ?? openRes.body.items[0]._id).toBe(
      fresh.id ?? fresh._id
    );

    const closedRes = await fetchJobs({ status: 'closed' });
    expect(closedRes.body.items).toHaveLength(1);
  });
});
