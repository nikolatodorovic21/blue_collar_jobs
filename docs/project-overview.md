---
title: Project Overview
type: reference
status: living
updated: 2026-05-26e
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
| Security headers | helmet (with CSP whitelisting `CLIENT_ORIGIN`) |
| Rate limiting | express-rate-limit (in-memory per-IP, per-route) |
| HTML sanitization | sanitize-html (Zod `.transform()` on free-text fields) |
| Logging | pino + pino-http (JSON in prod, pretty in dev, silent in test) |
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
| `GET` | `/api/jobs` | public | Filtered + cursor-paginated. Query params (all optional): `type` (enum), `location` (substring, case-insensitive), `priceMin`, `priceMax`, `status`, `limit` (default 20, max 100), `cursor`. AND composition. Response envelope `{ items, nextCursor }`. See [[01-decisions/015-cursor-pagination-shape]] + [[01-decisions/014-job-categories-enum]]. Runs the lazy-expiry sweep before filtering. |
| `GET` | `/api/jobs/:id` | public | Single job by id. 404 if missing. |
| `POST` | `/api/jobs` | auth + `client` + Zod + CSRF | Create a job. Body: `{type, price, location, description}`. `userId` derived from `req.user.id`. |
| `POST` | `/api/jobs/:id/bids` | auth + `worker` + Zod + CSRF | Worker submits a bid. Body: `{amount, message?, proposedDate?, estimatedDuration?}`. `workerId` derived from `req.user.id`. 403 self-bid, 409 if `job.status !== 'open'` OR worker already bid on this job (unique `{jobId, workerId}`). |
| `GET` | `/api/jobs/:id/bids` | auth | Job owner sees full list (worker populated with `name`/`email`); non-owners see only their own bid for that job. |
| `GET` | `/api/bids` | auth + `worker` | Caller's own bids. Query params ignored — `workerId` always = `req.user.id`. |
| `PATCH` | `/api/bids/:id/accept` | auth + `client` + CSRF | Accept a bid. Ownership: `req.user.id === job.userId`. Atomic via `Job.findOneAndUpdate({ _id, status:'open' }, ...)`; 409 if the job is no longer open. On success: bid → `accepted`, siblings (pending) → `rejected`, job → `assigned`. |
| `PATCH` | `/api/bids/:id` | auth + `worker` + Zod + CSRF | Worker edits own bid while `status === 'pending'`. Editable: `amount`, `message`, `proposedDate`, `estimatedDuration`. 403 if not owner; 409 if not pending. |
| `PATCH` | `/api/bids/:id/withdraw` | auth + `worker` + CSRF | Worker withdraws own pending bid → `status: 'withdrawn'`. 403 if not owner; 409 if not pending. |
| `PATCH` | `/api/jobs/:id/status` | auth + Zod + CSRF | Transition the job. Body: `{status, reason?}`. Server cross-checks `(from, to)` against the matrix in [backend/src/constants/jobStatusTransitions.ts](../backend/src/constants/jobStatusTransitions.ts) and enforces actor (`client` owner / `worker` = assigned / `either`). `cancel` + `dispute` require `reason`. Cascade: pending bids → `expired` on `cancelled` and on expiry-sweep `closed`. |
| `DELETE` | `/api/jobs/:id` | auth + Zod + CSRF | Soft-cancel. Optional `{ reason }` body (HTML-stripped, default `'Obrisano od strane vlasnika'`). Thin wrapper over `transitionJobStatus(... 'cancelled', reason)` — same actor matrix (open: client owner; assigned: either party). Returns 200 + the updated job; pending bids cascade to `expired`. Per ADR 012 — no `deletedAt` field; "cancelled" *is* the soft-delete. The frontend's existing "Otkaži posao" PATCH covers the user-facing flow; DELETE exists as a REST affordance for API clients. |
| `POST` | `/api/users` | public + Zod | Register. Bcrypt-hashes password, **auto-login** (issues JWT + CSRF cookies). |
| `GET` | `/api/users/:id` | public | Sanitized projection per [[01-decisions/013-public-user-route-shape]]: `{ id, name, role, skills, rating: { average, count } }`. 404 on invalid ObjectId or missing user. Address intentionally not selected. |
| `POST` | `/api/reviews` | auth + Zod + CSRF | Submit a review. Body: `{ jobId, rating: 1..5, comment? }`. Server derives `reviewerId` from `req.user.id` and `revieweeId` from the *other* participant (`job.userId` ↔ `job.assignedWorkerId`). 403 if caller wasn't on the job; 409 if job isn't `completed` or if the caller already reviewed it. |
| `GET` | `/api/reviews?userId=` | public | Reviews about `userId` (i.e. `revieweeId === userId`), reviewer populated with `name`/`role`, job populated with `type`, sorted newest first. |
| `POST` | `/api/auth/login` | public + Zod | Login. `bcrypt.compare`. On success issues JWT + CSRF cookies. 401 on miss (generic message). |
| `POST` | `/api/auth/logout` | public | Clears the token cookie. |
| `GET` | `/api/auth/me` | auth | Returns the current user from DB (identity from cookie). Used by frontend on app boot to rehydrate. |

> Identity (`userId`, `workerId`, `role`) is **never trusted from the body** — controllers read it from `req.user`, which is set by `requireAuth` after verifying the JWT cookie. Zod `.strict()` schemas drop any extra fields a client might inject.

**Source files:**
- Jobs — `backend/src/routes/jobs.routes.ts`, `controllers/jobs.controller.ts`, `services/jobs.service.ts`
- Bids — `backend/src/routes/bids.routes.ts`, `controllers/bids.controller.ts`, `services/bids.service.ts`, `models/bid.model.ts`
- Users — `backend/src/routes/users.routes.ts`, `controllers/users.controller.ts`, `services/users.service.ts`
- Reviews — `backend/src/routes/reviews.routes.ts`, `controllers/reviews.controller.ts`, `services/reviews.service.ts`, `models/review.model.ts`
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

| Attempt                                       | Status | Message                                                        |
| --------------------------------------------- | ------ | -------------------------------------------------------------- |
| Mutating request without a valid token cookie | `401`  | `Niste prijavljeni` / `Sesija je istekla, prijavite se ponovo` |
| Mutating request without a valid CSRF token   | `403`  | `CSRF token nije validan`                                      |
| Worker calls `POST /api/jobs`                 | `403`  | `Samo klijenti mogu izvršiti ovu radnju`                       |
| Non-worker calls `POST /api/jobs/:id/bids`    | `403`  | `Samo majstori mogu izvršiti ovu radnju`                       |
| Worker bids on own job                        | `403`  | `Ne možete dati ponudu na sopstveni posao`                     |
| Bid on job where `status !== 'open'`          | `409`  | `Posao više nije otvoren za ponude`                            |
| Non-client calls `PATCH /api/bids/:id/accept` | `403`  | `Samo klijenti mogu izvršiti ovu radnju`                       |
| Non-owner accepts a bid                       | `403`  | `Samo vlasnik posla može prihvatiti ponudu`                    |
| Accept on job where `status !== 'open'`       | `409`  | `Posao više nije otvoren za ponude`                            |
| Duplicate bid (same worker, same job)         | `409`  | `Već ste poslali ponudu za ovaj posao`                         |
| Edit/withdraw a non-pending bid               | `409`  | `Ponuda se više ne može menjati` / `… povući`                  |
| Edit/withdraw a bid you don't own             | `403`  | `Možete menjati / povući samo svoje ponude`                    |
| Job-status transition not in the matrix       | `409`  | `Nedozvoljena promena statusa`                                 |
| Job-status transition by wrong actor          | `403`  | `Nemate dozvolu za ovu promenu statusa`                        |
| Cancel/dispute transition without `reason`    | `409`  | `Razlog je obavezan za ovu promenu statusa`                    |
| Review on a job that isn't `completed`        | `409`  | `Recenzija je moguća tek kada je posao završen`                |
| Review by a non-participant                   | `403`  | `Niste učestvovali u ovom poslu`                               |
| Duplicate review (same reviewer + job)        | `409`  | `Već ste ostavili recenziju za ovaj posao`                     |
| `GET /api/users/:id` for missing / bad id     | `404`  | `Korisnik nije pronađen`                                       |
| `GET /api/jobs` with `priceMin > priceMax`    | `400`  | `Neispravni podaci` + `errors.priceMin = 'priceMin ne sme biti veći od priceMax'` |
| `GET /api/jobs` with a malformed `cursor`     | `400`  | `Nevažeći cursor`                                              |
| Zod validation failure                        | `400`  | `Neispravni podaci` + `errors: { field: msg }`                 |
| `Bid.amount` / `Job.price` out of `[1, 10_000_000]` | `400` | `Neispravni podaci` + `errors.amount` / `errors.price` |
| 11th pending bid by same worker               | `409`  | `Dostigli ste maksimalan broj aktivnih ponuda (10).`           |
| `DELETE /api/jobs/:id` on already-cancelled job | `409` | `Nedozvoljena promena statusa`                                 |
| `DELETE /api/jobs/:id` by non-owner client    | `403`  | `Nemate dozvolu za ovu promenu statusa`                        |
| Rate-limit exceeded (login / register / job-create / bid-submit) | `429` | `Previše zahteva, pokušajte ponovo kasnije.` |
| Any uncaught controller error                 | `500`  | `Serverska greška`                                             |

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
| `type` | `enum` | One of `'keramika' \| 'stolarija' \| 'elektrika' \| 'vodoinstalater' \| 'molerski_poslovi' \| 'ostalo'`. Snake_case keys are the persisted/wire values; display labels live in [frontend/src/constants/jobTypes.ts](../frontend/src/constants/jobTypes.ts) (`jobTypeLabel`). See [[01-decisions/014-job-categories-enum]]. |
| `price` | `number` | Orientation price in RSD |
| `location` | `string` | Work location / city |
| `description` | `string` | Detailed job description |
| `status` | `'open' \| 'assigned' \| 'in_progress' \| 'completed' \| 'cancelled' \| 'closed' \| 'disputed'` | Default `'open'`. Transitions via `PATCH /api/jobs/:id/status` (matrix in [backend/src/constants/jobStatusTransitions.ts](../backend/src/constants/jobStatusTransitions.ts) per [[01-decisions/012-job-status-enum-extension]]). |
| `userId` | `ObjectId` | Ref to `User`. **Poster only; never mutated post-create.** |
| `assignedWorkerId` | `ObjectId` | Ref to `User`. Set only when a bid is accepted. |
| `completedAt` | `Date?` | Stamped on transition to `completed`. |
| `cancelledAt` | `Date?` | Stamped on transition to `cancelled`. |
| `cancelReason` | `string?` | Captured on transition to `cancelled` (or `disputed`). |
| `expiresAt` | `Date?` | Server-side default `createdAt + 30d` per [[01-decisions/010-bid-and-job-expiry]]. `null` = no expiry (existing rows). |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

> The pre-pivot `taken: boolean` field is gone. The pre-pivot misuse of `userId` to mean *both* poster and assignee is fixed — `userId` is poster-only, `assignedWorkerId` carries the winner.

**Indexes:** `{ status: 1, createdAt: -1 }` (primary HomeView query — status filter + the default sort), `{ type: 1 }` (solo type filter), `{ userId: 1 }` (implicit when a client views their own jobs). Added in Group 3 per the architecture-follow-ups indexing-review trigger.

### Bid
*Mongoose schema ([backend/src/models/bid.model.ts](../backend/src/models/bid.model.ts))*

| Field | Type | Notes |
|---|---|---|
| `jobId` | `ObjectId` | Ref `Job`, required, indexed |
| `workerId` | `ObjectId` | Ref `User`, required, indexed |
| `amount` | `number` | RSD; `min: 0` |
| `message` | `string` | Optional, default `''` |
| `status` | `'pending' \| 'accepted' \| 'rejected' \| 'withdrawn' \| 'expired'` | Default `'pending'`. `withdrawn` set by `PATCH /api/bids/:id/withdraw`; `expired` set by the lazy expiry sweep and by cancel cascade. |
| `proposedDate` | `Date?` | Optional; worker-offered arrival date. Zod-guarded to be in the future at submit/edit time. |
| `estimatedDuration` | `{ value: number; unit: 'hours'\|'days' }?` | Optional; worker-offered length of work. |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

Compound **unique** index on `{ jobId, workerId }` — one bid per worker per job. Edits mutate in place (per [[01-decisions/009-bid-editability-while-pending]]).

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
*Mongoose schema ([backend/src/models/review.model.ts](../backend/src/models/review.model.ts))*

| Field | Type | Notes |
|---|---|---|
| `jobId` | `ObjectId` | Ref `Job`, required, indexed |
| `reviewerId` | `ObjectId` | Ref `User`, required, indexed. Always `req.user.id`; never trusted from the body. |
| `revieweeId` | `ObjectId` | Ref `User`, required, indexed. Server-derived from job participants (the *other* party). |
| `rating` | `number` | Required, `min: 1`, `max: 5`. |
| `comment` | `string` | Optional, default `''`, max 1000 chars. |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

Unique compound index on `{ jobId, reviewerId }` — one review per reviewer per job. Separate `{ revieweeId }` index for "reviews about user X" queries. Bidirectional model: clients review workers AND workers review clients; today only the worker profile renders reviews.

---

## Frontend Routes

| Path | View | Guard |
|---|---|---|
| `/` | `HomeView` — all open jobs the user doesn't own | `requiresAuth` |
| `/jobs` | `JobsView` — role-aware: worker sees "Moje ponude", client sees their posted jobs | `requiresAuth` |
| `/jobs/:id/bids` | `JobBidsView` — bid list for a job; accept UI for the job owner; "Ostavi recenziju" entry on `completed` | `requiresAuth` |
| `/users/:id` | `WorkerProfileView` — public profile (name, role, skills, rating, reviews) | public |
| `/post-job` | `PostJobView` — create a new job | `requiresAuth` + in-view `role === 'client'` (redirects otherwise) |
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
