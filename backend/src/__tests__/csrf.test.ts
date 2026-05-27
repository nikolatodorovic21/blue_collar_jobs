import { describe, it, expect } from 'vitest';
import { createJob, registerAndLogin } from './helpers';

describe('CSRF boundary', () => {
  it('mutating request with valid token cookie but missing X-CSRF-Token returns 403', async () => {
    const client = await registerAndLogin('client');
    const res = await client.agent.post('/api/jobs').send({
      type: 'keramika',
      price: 8000,
      location: 'Beograd',
      description: 'X'
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('CSRF token nije validan');
  });

  it('mutating request with wrong X-CSRF-Token returns 403', async () => {
    const client = await registerAndLogin('client');
    const res = await client.agent
      .post('/api/jobs')
      .set('X-CSRF-Token', 'not-the-real-token')
      .send({ type: 'keramika', price: 8000, location: 'Beograd', description: 'X' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('CSRF token nije validan');
  });

  it('GET requests succeed without X-CSRF-Token', async () => {
    const client = await registerAndLogin('client');
    await createJob(client);
    const res = await client.agent.get('/api/jobs');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('login is exempt from CSRF (no header required)', async () => {
    const client = await registerAndLogin('client');
    const res = await client.agent
      .post('/api/auth/login')
      .send({ email: client.user.email, password: 'lozinka123' });
    expect(res.status).toBe(200);
  });
});
