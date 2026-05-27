import request, { Test } from 'supertest';
import type { Express } from 'express';
import app from '../app';
import type { JobStatus } from '../models/job.model';

export type Role = 'client' | 'worker';

export interface AuthedClient {
  agent: ReturnType<typeof request.agent>;
  user: { id: string; email: string; name: string; role: Role };
  csrfToken: string;
}

const CSRF_COOKIE = 'csrf-token';

const extractCookieValue = (
  setCookieHeader: string[] | undefined,
  name: string
): string | null => {
  if (!setCookieHeader) return null;
  for (const raw of setCookieHeader) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const cookieName = pair.slice(0, eq).trim();
    if (cookieName === name) {
      return decodeURIComponent(pair.slice(eq + 1));
    }
  }
  return null;
};

let userCounter = 0;
const uniqueEmail = (role: Role) => {
  userCounter += 1;
  return `${role}-${Date.now()}-${userCounter}@test.local`;
};

export const registerAndLogin = async (
  role: Role,
  overrides: Partial<{ email: string; password: string; name: string }> = {}
): Promise<AuthedClient> => {
  const email = overrides.email ?? uniqueEmail(role);
  const password = overrides.password ?? 'lozinka123';
  const name = overrides.name ?? (role === 'client' ? 'Klijent Test' : 'Majstor Test');

  const agent = request.agent(app as Express);
  const res = await agent
    .post('/api/users')
    .send({ email, password, name, role });

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const rawSetCookie = res.headers['set-cookie'];
  const setCookie = Array.isArray(rawSetCookie)
    ? rawSetCookie
    : rawSetCookie
      ? [rawSetCookie as string]
      : undefined;
  const csrfToken = extractCookieValue(setCookie, CSRF_COOKIE);
  if (!csrfToken) {
    throw new Error('csrf-token cookie missing from registration response');
  }

  return {
    agent,
    user: { id: res.body.id ?? res.body._id, email, name, role },
    csrfToken
  };
};

export const withCsrf = (req: Test, csrfToken: string) =>
  req.set('X-CSRF-Token', csrfToken);

export const createJob = async (
  client: AuthedClient,
  overrides: Partial<{
    type: string;
    price: number;
    location: string;
    description: string;
  }> = {}
) => {
  const body = {
    type: overrides.type ?? 'keramika',
    price: overrides.price ?? 10000,
    location: overrides.location ?? 'Beograd',
    description: overrides.description ?? 'Testni posao'
  };
  const res = await withCsrf(client.agent.post('/api/jobs'), client.csrfToken).send(body);
  if (res.status !== 201) {
    throw new Error(`createJob failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
};

export const submitBid = async (
  worker: AuthedClient,
  jobId: string,
  overrides: Partial<{
    amount: number;
    message: string;
    proposedDate: string | Date;
    estimatedDuration: { value: number; unit: 'hours' | 'days' };
  }> = {}
) => {
  const body: Record<string, unknown> = {
    amount: overrides.amount ?? 9000,
    message: overrides.message ?? 'Mogu odmah'
  };
  if (overrides.proposedDate !== undefined) body.proposedDate = overrides.proposedDate;
  if (overrides.estimatedDuration !== undefined) {
    body.estimatedDuration = overrides.estimatedDuration;
  }
  const res = await withCsrf(
    worker.agent.post(`/api/jobs/${jobId}/bids`),
    worker.csrfToken
  ).send(body);
  if (res.status !== 201) {
    throw new Error(`submitBid failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
};

export const deleteJob = async (
  actor: AuthedClient,
  jobId: string,
  reason?: string
) => {
  const body = reason !== undefined ? { reason } : {};
  return await withCsrf(
    actor.agent.delete(`/api/jobs/${jobId}`),
    actor.csrfToken
  ).send(body);
};

export const unauthedRequest = () => request(app as Express);

export const acceptBid = async (client: AuthedClient, bidId: string) => {
  const res = await withCsrf(
    client.agent.patch(`/api/bids/${bidId}/accept`),
    client.csrfToken
  ).send();
  if (res.status !== 200) {
    throw new Error(`acceptBid failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
};

export const transitionJobStatus = async (
  actor: AuthedClient,
  jobId: string,
  status: JobStatus,
  reason?: string
) => {
  const body: Record<string, unknown> = { status };
  if (reason !== undefined) body.reason = reason;
  const res = await withCsrf(
    actor.agent.patch(`/api/jobs/${jobId}/status`),
    actor.csrfToken
  ).send(body);
  if (res.status !== 200) {
    throw new Error(
      `transitionJobStatus(${status}) failed: ${res.status} ${JSON.stringify(res.body)}`
    );
  }
  return res.body;
};
