# The Marketplace Loop

> A one-page explainer of what this app actually does: clients post jobs, workers take them, both sides see the result. If you're new to the codebase, **read this first** — then [[project-overview]] for architecture and [[index]] for the file map.

---

## The roles

| Role | Serbian | Can post? | Can take? |
|---|---|---|---|
| **Client** | *klijent* | ✅ | ❌ |
| **Worker** | *majstor* | ❌ | ✅ |

A user picks one at registration ([RegisterView.vue](../frontend/src/views/RegisterView.vue)). The choice is permanent in the current model — there's no role-switching. `User.role` is enum-validated by Mongoose ([user.model.ts](../backend/src/models/user.model.ts)).

---

## The three flows

### 1. Client posts a job

```
Client                Frontend                   Backend                    MongoDB
  │                      │                          │                          │
  │  fills form  ───────►│                          │                          │
  │                      │  POST /api/jobs          │                          │
  │                      │  { type, price, location,│                          │
  │                      │    description, userId,  │                          │
  │                      │    role: "client" }      │                          │
  │                      ├─────────────────────────►│                          │
  │                      │                          │  validate role==="client"│
  │                      │                          │  validate userId         │
  │                      │                          │  Job.create(...)         │
  │                      │                          ├─────────────────────────►│
  │                      │                          │◄─────────────────────────┤
  │                      │◄─────────────────────────┤  201 + Job               │
  │                      │  redirect to /           │                          │
  │  sees home  ◄────────┤                          │                          │
```

Files: [PostJobView.vue](../frontend/src/views/PostJobView.vue) → [api.ts `addJob`](../frontend/src/services/api.ts) → [jobs.controller.ts `addJob`](../backend/src/controllers/jobs.controller.ts) → [jobs.service.ts `createJob`](../backend/src/services/jobs.service.ts).

### 2. Worker takes a job

```
Worker                Frontend                   Backend                    MongoDB
  │                      │                          │                          │
  │  clicks "Preuzmi" ──►│                          │                          │
  │                      │  PATCH /api/jobs/:id     │                          │
  │                      │  { taken: true, userId,  │                          │
  │                      │    role: "worker" }      │                          │
  │                      ├─────────────────────────►│                          │
  │                      │                          │  validate role==="worker"│
  │                      │                          │  validate userId         │
  │                      │                          │  Job.findById            │
  │                      │                          ├─────────────────────────►│
  │                      │                          │◄─────────────────────────┤
  │                      │                          │  reject if               │
  │                      │                          │    job.userId == userId  │
  │                      │                          │    (self-take)           │
  │                      │                          │  findByIdAndUpdate(      │
  │                      │                          │    taken: true, userId)  │
  │                      │                          ├─────────────────────────►│
  │                      │                          │◄─────────────────────────┤
  │                      │◄─────────────────────────┤  200 + updated Job       │
  │                      │  update local list       │                          │
  │  sees update  ◄──────┤                          │                          │
```

Files: [HomeView.vue `handleTakeJob`](../frontend/src/views/HomeView.vue) → [api.ts `takeJob`](../frontend/src/services/api.ts) → [jobs.controller.ts `updateJob`](../backend/src/controllers/jobs.controller.ts) → [jobs.service.ts `takeJob`](../backend/src/services/jobs.service.ts).

### 3. Both sides see the result

`GET /api/jobs` returns every job. The frontend filters client-side:

- **Worker on home (`/`)** — `!job.taken && job.userId !== currentUser.id` (don't show own posted jobs — defense in depth even though workers shouldn't be posting)
- **Worker on /jobs ("Moji Poslovi")** — `job.taken && job.userId === currentUser.id`
- **Client on home** — same filter as worker; clients still see all open jobs but the **"Preuzmi" button is hidden** for non-workers (see [JobsTable.vue `canTake`](../frontend/src/components/JobsTable.vue))
- **Client on /jobs** — empty (the view's filter assumes taken-by-current-user, which is meaningless for clients)

The "Postavi posao" link in [NavBar.vue](../frontend/src/components/NavBar.vue) only renders for clients.

---

## The four 403 cases

These are the rules the backend enforces today. **All four are soft** — see [[phase-0-review]] for the security caveat.

| Attempt | Status | Message |
|---|---|---|
| Worker calls `POST /api/jobs` | `403` | `Samo klijenti mogu postaviti posao` |
| Client calls `PATCH /api/jobs/:id` | `403` | `Samo majstori mogu preuzeti posao` |
| User calls `PATCH /api/jobs/:id` where `job.userId === body.userId` | `403` | `Ne možete preuzeti sopstveni posao` |
| `userId` missing from body on `POST` or `PATCH` | `400` | `userId is required` |

Source: [jobs.controller.ts](../backend/src/controllers/jobs.controller.ts).

---

## Try it yourself with curl

```bash
# Register a client
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"c@x.com","password":"p","name":"C","role":"client"}'
# → grab the returned _id, call it CLIENT_ID

# Register a worker
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"w@x.com","password":"p","name":"W","role":"worker","skills":["Keramika"]}'
# → grab the returned _id, call it WORKER_ID

# Client posts a job
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"Keramika\",\"price\":10000,\"location\":\"NS\",\"description\":\"...\",\"userId\":\"$CLIENT_ID\",\"role\":\"client\"}"
# → grab the returned _id, call it JOB_ID

# Worker takes it
curl -X PATCH "http://localhost:5000/api/jobs/$JOB_ID" \
  -H "Content-Type: application/json" \
  -d "{\"taken\":true,\"userId\":\"$WORKER_ID\",\"role\":\"worker\"}"
```

---

## What's *not* in the loop yet

Things the marketplace would normally include but currently doesn't:

- **Confirmation / acceptance** — a worker "taking" is a one-shot commit; there's no client-side approval, no "the worker showed up", no "the job is done".
- **Reviews** — a `JobReviews.vue` component stub exists but isn't wired to any endpoint and there's no Mongoose model.
- **Cancellation** — once `taken: true`, there's no path back.
- **Messaging between client and worker.**
- **Payments.**

These are flagged in [[phase-0-review]] and [[app-state-audit]] as Phase 2 / Phase 3 work.

---

## Links

- [[index]] — file map
- [[project-overview]] — full architecture, endpoint catalog, data models
- [[phase-0-review]] — what's verified, what's soft, what's next
- [[app-state-audit]] — full rolling audit + roadmap
