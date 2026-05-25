---
title: Project Overview
type: reference
status: living
updated: 2026-05-25b
---

# Project Overview — Poslovi

> Authoritative reference for the project's architecture, tech stack, API surface, data models, frontend routes, and how the marketplace loop works. Current state (what works / what's broken) lives in [[app-state-audit]]; the roadmap in [[project-plan]].

Poslovi is a Serbian-language job marketplace connecting workers (*majstori*) and clients (*klijenti*). The settled domain model is **bidding** — clients post jobs, workers submit bids, the client accepts one. Implemented as of 2026-05-25 ([[project-plan]] Tier 1 landed).

---

## Architecture

```
monorepo/
├── backend/    # Node.js + Express REST API
├── frontend/   # Vue 3 SPA
├── docs/       # This Obsidian vault (gitignored)
└── db.json     # Sample data reference (no longer served, schema-stale)
```

- **Pattern:** REST API consumed by an SPA via Axios with `withCredentials: true`.
- **Auth:** Express + MongoDB + JWT in an httpOnly cookie (Tier 2, shipped 2026-05-25). Registration creates a bcrypt-hashed user, login compares with `bcrypt.compare`, the response sets `token` (httpOnly, SameSite=Lax) and `csrf-token` (readable, used for the X-CSRF-Token header). `requireAuth` middleware verifies the JWT on every mutating endpoint and attaches `req.user`. Frontend caches `{id, name, role}` in localStorage purely for instant UI state; the cookie is the source of truth.
- **Database:** MongoDB (`jobs-db` at `localhost:27017`). One backend on `:5000`; no `json-server`.
- **Seed:** `cd backend && npm run seed` wipes the DB and inserts one client + one worker + one open job. See [backend/src/scripts/seed.ts](../backend/src/scripts/seed.ts).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js + TypeScript 6 |
| Backend framework | Express 5.1 |
| ODM | Mongoose 8.15 |
| Password hashing | bcryptjs (10 rounds) |
| Auth tokens | jsonwebtoken (HS256, 7-day) in httpOnly cookie |
| CSRF | csrf-csrf (double-submit, X-CSRF-Token header) |
| Request validation | zod (`.strict()` per resource) |
| Frontend framework | Vue 3.5 + TypeScript 5.8 |
| Build tool | Vite 6.2 |
| State management | Vuex 4 *(configured but unused)* |
| Routing | Vue Router 4.5 |
| HTTP client | Axios 1.9 |
| UI | Bootstrap 5.3 |

**Dev servers:**
- Backend: `http://localhost:5000` (`npm run dev` in `backend/`) — env from `backend/.env`
- Frontend: `http://localhost:5173` (`npm run dev` in `frontend/`)
- `api.ts` baseURL is `http://localhost:5000/api`

---

## API Endpoints

Base path: `/api`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jobs` | public | All jobs. No filters yet. |
| `GET` | `/api/jobs/:id` | public | Single job by id. 404 if missing. |
| `POST` | `/api/jobs` | auth + `client` + Zod + CSRF | Create a job. Body: `{type, price, location, description}`. `userId` derived from `req.user.id`. |
| `POST` | `/api/jobs/:id/bids` | auth + `worker` + Zod + CSRF | Worker submits a bid. Body: `{amount, message?}`. `workerId` derived from `req.user.id`. 403 self-bid, 409 if `job.status !== 'open'`. |
| `GET` | `/api/jobs/:id/bids` | auth | Job owner sees full list (worker populated with `name`/`email`); non-owners see only their own bid for that job. |
| `GET` | `/api/bids` | auth + `worker` | Caller's own bids. Query params ignored — `workerId` always = `req.user.id`. |
| `PATCH` | `/api/bids/:id/accept` | auth + `client` + CSRF | Accept a bid. Ownership: `req.user.id === job.userId`. 409 if `job.status !== 'open'`. On success: bid → `accepted`, siblings → `rejected`, job → `assigned`. |
| `POST` | `/api/users` | public + Zod | Register. Bcrypt-hashes password, **auto-login** (issues JWT + CSRF cookies). |
| `POST` | `/api/auth/login` | public + Zod | Login. `bcrypt.compare`. On success issues JWT + CSRF cookies. 401 on miss (generic message). |
| `POST` | `/api/auth/logout` | public | Clears the token cookie. |
| `GET` | `/api/auth/me` | auth | Returns the current user from DB (identity from cookie). Used by frontend on app boot to rehydrate. |

> Identity (`userId`, `workerId`, `role`) is **never trusted from the body** — controllers read it from `req.user`, which is set by `requireAuth` after verifying the JWT cookie. Zod `.strict()` schemas drop any extra fields a client might inject.

**Source files:**
- Jobs — `backend/src/routes/jobs.routes.ts`, `controllers/jobs.controller.ts`, `services/jobs.service.ts`
- Bids — `backend/src/routes/bids.routes.ts`, `controllers/bids.controller.ts`, `services/bids.service.ts`, `models/bid.model.ts`
- Users — `backend/src/routes/users.routes.ts`, `controllers/users.controller.ts`, `services/users.service.ts`
- Auth — `backend/src/routes/auth.routes.ts`, `controllers/auth.controller.ts`, `services/auth.service.ts`

---

## The Marketplace Loop

### Roles

| Role | Serbian | Can post? | Can bid? | Can accept? |
|---|---|---|---|---|
| Client | *klijent* | ✅ | ❌ | ✅ (on their own jobs) |
| Worker | *majstor* | ❌ | ✅ (not own jobs) | ❌ |

User picks one at registration ([RegisterView.vue](../frontend/src/views/RegisterView.vue)). `User.role` is enum-validated by Mongoose.

### Flow 1 — Client posts a job

```
Client → PostJobView form
       → POST /api/jobs { type, price, location, description }   + cookies (token, csrf) + X-CSRF-Token header
       → CSRF middleware: header matches cookie ✓
       → requireAuth: jwt.verify(cookie.token) → req.user = { id, role }
       → requireRole('client') ✓
       → Zod parse (drops any sneaky userId/role from body)
       → Job.create with userId = req.user.id, status:'open'
       → 201 + Job
       → redirect to /
```

Files: [PostJobView.vue](../frontend/src/views/PostJobView.vue) → [api.ts `addJob`](../frontend/src/services/api.ts) → [jobs.controller.ts `addJob`](../backend/src/controllers/jobs.controller.ts) → [jobs.service.ts `createJob`](../backend/src/services/jobs.service.ts).

### Flow 2 — Worker submits a bid

```
Worker → on HomeView, clicks "Postavi ponudu" on an open job
       → bid modal (amount + optional message)
       → POST /api/jobs/:id/bids { amount, message }   + cookies + X-CSRF-Token
       → CSRF + requireAuth + requireRole('worker') + Zod
       → load job, reject self-bid (job.userId vs req.user.id), reject non-open job
       → Bid.create with workerId = req.user.id, status:'pending'
       → 201 + Bid
       → modal closes, jobs refresh
```

Files: [HomeView.vue `handleSubmitBid`](../frontend/src/views/HomeView.vue) → [api.ts `submitBid`](../frontend/src/services/api.ts) → [bids.controller.ts `submitBid`](../backend/src/controllers/bids.controller.ts) → [bids.service.ts `createBid`](../backend/src/services/bids.service.ts).

### Flow 3 — Client reviews bids and accepts one

```
Client → on /jobs ("Moji poslovi i ponude") → clicks "Vidi ponude" on a posted job
       → router push /jobs/:id/bids
       → JobBidsView loads GET /api/jobs/:id  AND  GET /api/jobs/:id/bids (auth)
       → because req.user.id === job.userId, client sees the full bid list
         (non-owners would only see their own bid for that job)
       → clicks "Prihvati" on chosen bid
       → PATCH /api/bids/:bidId/accept   + cookies + X-CSRF-Token   (body empty)
       → CSRF + requireAuth + requireRole('client')
       → load bid + job, check req.user.id === job.userId, check job is open
       → 3 sequential updates: this bid → accepted, sibling bids → rejected,
         job → { status:'assigned', assignedWorkerId: bid.workerId }
       → 200 + updated Bid
       → view refetches, header shows "Dodeljen", buttons disappear
```

Files: [JobBidsView.vue](../frontend/src/views/JobBidsView.vue) → [api.ts `acceptBid`](../frontend/src/services/api.ts) → [bids.controller.ts `acceptBid`](../backend/src/controllers/bids.controller.ts) → [bids.service.ts `acceptBid`](../backend/src/services/bids.service.ts).

### Flow 4 — Both sides see results

- **Worker on `/`** (HomeView) — filter `job.status === 'open' && job.userId !== currentUser.id`. Accepted/rejected jobs drop off the list.
- **Worker on `/jobs`** ("Moje ponude") — calls `GET /api/bids`, server filters to `req.user.id`.
- **Client on `/`** — same open-jobs filter. The bid button is hidden because `currentUserRole !== 'worker'`.
- **Client on `/jobs`** ("Moji poslovi i ponude") — filter `job.userId === currentUser.id`, shows all posted jobs + a "Vidi ponude" button per row.
- **Client on `/jobs/:id/bids`** — full bid review + accept UI.

### Error matrix

| Attempt | Status | Message |
|---|---|---|
| Mutating request without a valid token cookie | `401` | `Niste prijavljeni` / `Sesija je istekla, prijavite se ponovo` |
| Mutating request without a valid CSRF token | `403` | `CSRF token nije validan` |
| Worker calls `POST /api/jobs` | `403` | `Samo klijenti mogu izvršiti ovu radnju` |
| Non-worker calls `POST /api/jobs/:id/bids` | `403` | `Samo majstori mogu izvršiti ovu radnju` |
| Worker bids on own job | `403` | `Ne možete dati ponudu na sopstveni posao` |
| Bid on job where `status !== 'open'` | `409` | `Posao više nije otvoren za ponude` |
| Non-client calls `PATCH /api/bids/:id/accept` | `403` | `Samo klijenti mogu izvršiti ovu radnju` |
| Non-owner accepts a bid | `403` | `Samo vlasnik posla može prihvatiti ponudu` |
| Accept on job where `status !== 'open'` | `409` | `Posao više nije otvoren za ponude` |
| Zod validation failure | `400` | `Neispravni podaci` + `errors: { field: msg }` |

### Try it yourself with curl

Cookies must persist across calls — use `-c worker.jar` / `-b worker.jar`.

```bash
# Seed (wipes DB)
cd backend && npm run seed

# Login as worker — captures token + csrf-token cookies
curl -c worker.jar -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"majstor@test.com","password":"lozinka123"}'

# Read the CSRF token out of the jar (the value of the csrf-token cookie)
CSRF=$(awk '/csrf-token/{print $7}' worker.jar)

# Submit a bid — token cookie carries identity, X-CSRF-Token guards the mutation
curl -b worker.jar -X POST http://localhost:5000/api/jobs/<JOB_ID>/bids \
  -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF" \
  -d '{"amount":12000,"message":"Mogu doci u subotu"}'

# Login as client (separate jar)
curl -c client.jar -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"klijent@test.com","password":"lozinka123"}'
CSRF_C=$(awk '/csrf-token/{print $7}' client.jar)

# See the bids (auth required; owner gets full list)
curl -b client.jar http://localhost:5000/api/jobs/<JOB_ID>/bids

# Accept the bid (no body needed; identity comes from cookie)
curl -b client.jar -X PATCH http://localhost:5000/api/bids/<BID_ID>/accept \
  -H "X-CSRF-Token: $CSRF_C"

# Verify the job is now assigned
curl http://localhost:5000/api/jobs/<JOB_ID>
```

---

## Data Models

### Job
*Mongoose schema — persisted to MongoDB ([backend/src/models/job.model.ts](../backend/src/models/job.model.ts))*

| Field | Type | Notes |
|---|---|---|
| `type` | `string` | Job category (e.g. Keramika, Elektrika) |
| `price` | `number` | Orientation price in RSD |
| `location` | `string` | Work location / city |
| `description` | `string` | Detailed job description |
| `status` | `'open' \| 'assigned' \| 'completed' \| 'closed'` | Default `'open'`. Flips to `'assigned'` on accept. `completed`/`closed` enum-valid but not yet wired to UI. |
| `userId` | `ObjectId` | Ref to `User`. **Poster only; never mutated post-create.** |
| `assignedWorkerId` | `ObjectId` | Ref to `User`. Set only when a bid is accepted. |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

> The pre-pivot `taken: boolean` field is gone. The pre-pivot misuse of `userId` to mean *both* poster and assignee is fixed — `userId` is poster-only, `assignedWorkerId` carries the winner.

### Bid
*Mongoose schema ([backend/src/models/bid.model.ts](../backend/src/models/bid.model.ts))*

| Field | Type | Notes |
|---|---|---|
| `jobId` | `ObjectId` | Ref `Job`, required, indexed |
| `workerId` | `ObjectId` | Ref `User`, required, indexed |
| `amount` | `number` | RSD; `min: 0` |
| `message` | `string` | Optional, default `''` |
| `status` | `'pending' \| 'accepted' \| 'rejected'` | Default `'pending'` |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

Compound index on `{ jobId, workerId }` (helps the soft "has this worker already bid?" lookup; not a unique constraint — bid editability is an open question in [[project-plan]]).

### User
*Mongoose schema ([backend/src/models/user.model.ts](../backend/src/models/user.model.ts))*

| Field | Type | Notes |
|---|---|---|
| `email` | `string` | Unique, lowercase, trimmed |
| `password` | `string` | **bcrypt hash** (10 salt rounds); never serialized — `toJSON` strips it |
| `name` | `string` | Display name |
| `role` | `"worker" \| "client"` | Enum — required |
| `skills` | `string[]` | Worker specializations; default `[]` |
| `address` | `string` | Client address (optional) |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

### Review
*Present in `db.json` only — no Mongoose model yet. Tracked in [[project-plan]] Tier 3.*

---

## Frontend Routes

| Path | View | Guard |
|---|---|---|
| `/` | `HomeView` — all open jobs the user doesn't own | `requiresAuth` |
| `/jobs` | `JobsView` — role-aware: worker sees "Moje ponude", client sees their posted jobs | `requiresAuth` |
| `/jobs/:id/bids` | `JobBidsView` — bid list for a job; accept UI for the job owner | `requiresAuth` |
| `/post-job` | `PostJobView` — create a new job | `requiresAuth` + in-view `role === 'client'` (redirects otherwise) |
| `/about` | `AboutView` *(stub)* | `requiresAuth` |
| `/contact` | `ContactView` *(stub)* | `requiresAuth` |
| `/login` | `LoginView` | `guestOnly` |
| `/register` | `RegisterView` | `guestOnly` |

---

## Auth Flow

```
Browser → POST /api/auth/login { email, password }
       ← 200 { id, email, name, role, ... }   (password stripped by toJSON)
       + Set-Cookie: token=<JWT>; HttpOnly; SameSite=Lax; Max-Age=7d
       + Set-Cookie: csrf-token=<value>; SameSite=Lax   (readable by JS)
Browser → localStorage.setItem('user', '{id,name,role}')   (display cache only)

Browser → next mutating request
         Cookie: token=<JWT>; csrf-token=<value>
         X-CSRF-Token: <value>   (axios request interceptor copies it from the cookie)

Server  → cookieParser → CSRF middleware (header must match cookie)
        → route middleware: requireAuth (jwt.verify → req.user) + requireRole + Zod
        → controller uses req.user.id; body identity is ignored (Zod .strict drops it)

Browser → POST /api/auth/logout → Set-Cookie: token=; Max-Age=0
Browser → GET /api/auth/me     → returns the current user (used by App.vue on boot to rehydrate)
```

Frontend uses `withCredentials: true` so cookies ride along automatically. The `'user'` key in localStorage is a display-only cache (id, name, role) — clearing it logs the user out client-side but the cookie also has to be cleared via `POST /api/auth/logout` for full sign-out.

---

## Links

- [[index]] — file map + note index
- [[app-state-audit]] — current state (works / soft / broken / missing)
- [[project-plan]] — prioritized roadmap (bidding pivot + tiers)
- [[worklog]] — chronological session log
