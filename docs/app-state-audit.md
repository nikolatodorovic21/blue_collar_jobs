---
title: App State Audit
type: audit
status: living
updated: 2026-05-26e
---

# App State Audit

> Single source of truth for **what's true about the running app right now.** Architecture and endpoint reference lives in [[project-overview]]; the roadmap in [[project-plan]]; chronological history in [[worklog]].
>
> Each item below is verified either live (`live` — exercised via curl + DB inspection or browser) or by static code trace (`static`). Update checkboxes as work lands.

**Last verified:** 2026-05-26 (Tier 3 group 4 landed — helmet + CSP, rate-limiting, HTML sanitization, pending-bid cap, DELETE soft-cancel, pino structured logging, About/Contact stubs removed, integration suite expanded to 43 tests across 8 files)

---

## ✅ Works

Verified working in the current build.

### Auth
- [x] **Register** — `POST /api/users` validates with Zod (`registerSchema.strict()`), returns 409 on duplicate email, hashes with bcrypt (10 rounds), strips password via `toJSON`, **issues JWT + CSRF cookies on success (auto-login)**. *(live)*
- [x] **Login** — `POST /api/auth/login` validates with Zod, case-insensitive email lookup, `bcrypt.compare`, generic 401 on miss, **issues JWT in httpOnly cookie + CSRF token cookie**. *(live)*
- [x] **JWT in httpOnly cookie** — signed HS256, 7-day expiry, `SameSite=Lax`, `Secure` only in production. Payload `{ sub, role }`. `document.cookie` cannot read it. *(live)*
- [x] **`requireAuth` middleware** — reads `req.cookies.token`, `jwt.verify`, attaches `req.user = { id, role }`; 401 on missing/invalid. *(live)*
- [x] **`requireRole('client' | 'worker')` middleware** — gates job-create / bid-submit / bid-accept by `req.user.role`. *(live)*
- [x] **CSRF protection** — `csrf-csrf` double-submit. Non-httpOnly `csrf-token` cookie + `X-CSRF-Token` header required on all mutating requests (login/register exempt). *(live)*
- [x] **Logout** — `POST /api/auth/logout` clears the token cookie. *(live)*
- [x] **`GET /api/auth/me`** — returns the current user from DB (sourced from cookie identity), used by frontend on app boot to rehydrate the display cache. *(live)*
- [x] **Server-side filtering on GETs** — `GET /api/bids` ignores any `?workerId=` and returns only `req.user.id`'s bids; `GET /api/jobs/:id/bids` returns all bids only to the job owner, otherwise only the caller's own bid. *(live)*
- [x] **Identity locked out of request bodies** — Zod `.strict()` schemas **reject** requests with unknown fields (400 `Neispravni podaci`, `errors.\_ = "Unrecognized keys: userId, role"`). Confirmed live via curl. Identity is only ever derived from `req.user`. *(live)*
- [x] **Password never leaves backend** — `toJSON` transform on `User` schema deletes `password` from every serialization. *(live)*
- [x] **CSRF bound to JWT session.** `getSessionIdentifier` reads `req.cookies.token`, so the CSRF HMAC is tied to the JWT value. **A request with no auth cookie returns 403 CSRF first** — `requireAuth`'s 401 path is unreachable from a normal client. Defense-in-depth, not a bug. *(live — covered by `csrf.test.ts` + `auth.negative.test.ts`)*

### Jobs
- [x] **Post a job** — `POST /api/jobs` requires `requireAuth` + `requireRole('client')` + Zod validation; `userId` is set from `req.user.id` (token, not body). Job starts with `status: 'open'`. *(live)*
- [x] **Get all jobs** — `GET /api/jobs` returns all jobs with the new `status` + `assignedWorkerId` shape. *(live)*
- [x] **Get one job** — `GET /api/jobs/:id` returns the job or 404. *(live)*

### Bidding (Tier 1 + Tier 3 group 1)
- [x] **Submit a bid** — `POST /api/jobs/:id/bids` (requires auth + `worker` role + Zod). `workerId` is from `req.user.id`; 403 self-bid, 409 job-not-open. Body now also accepts optional `proposedDate` (future date) and `estimatedDuration: { value, unit: 'hours'|'days' }`. 409 on duplicate (unique `{jobId, workerId}` index). *(static — endpoint + types verified, race + duplicate behaviour covered by integration test)*
- [x] **List bids for a job** — `GET /api/jobs/:id/bids` (auth required). Job owner sees all bids with worker `name` populated; non-owners see only their own bid for that job. *(live)*
- [x] **Worker's own bids** — `GET /api/bids` (auth + `worker` role). Returns `req.user.id`'s bids; query params ignored. *(live)*
- [x] **Accept a bid** — `PATCH /api/bids/:id/accept` (auth + `client` role). Concurrent-accept protected via conditional `Job.findOneAndUpdate({ _id, status: 'open' }, ...)`. On null result → 409 `'Posao više nije otvoren za ponude'` *before* any bid statuses are touched. Sibling-rejection cascade is scoped to `status: 'pending'` so previously withdrawn/expired bids stay put. *(live — covered by integration test [backend/src/__tests__/bids.accept-race.test.ts](backend/src/__tests__/bids.accept-race.test.ts))*
- [x] **Edit a bid** — `PATCH /api/bids/:id` (auth + `worker` role + Zod). Worker-owned, only while `status === 'pending'`. Editable fields: `amount`, `message`, `proposedDate`, `estimatedDuration`. Mongoose `timestamps` surface as `updatedAt`. *(static)*
- [x] **Withdraw a bid** — `PATCH /api/bids/:id/withdraw` (auth + `worker` role). Worker-owned, only while `pending`. Sets `status: 'withdrawn'`. *(static)*
- [x] **Bid expiry (lazy on read)** — `Bid.status` enum gains `'expired'`. When `GET /api/jobs` / `GET /api/jobs/:id` runs the expiry sweep, any open job past its `expiresAt` flips to `'closed'` and its pending bids cascade to `'expired'`. Cancellation of a job (`open|assigned → cancelled`) also cascades pending bids to `'expired'`. *(static)*
- [x] **"Postavi ponudu" UI** — workers see the button on open jobs they don't own; modal now collects amount + optional date + optional duration + optional message. *(static)*
- [x] **"Moje ponude" UI** — worker route `/jobs` shows bids with date/duration/status columns, per-row Edit and Withdraw buttons gated by `status === 'pending'`, plus an "(uređeno)" badge. *(static)*
- [x] **"Ponude na moj posao" UI** — client route `/jobs/:id/bids` shows date + duration columns, "(uređeno)" badges, and a header action row with "Označi kao završen" / "Otkaži posao" / "Prijavi spor" buttons gated by the matrix. Assigned worker on the same view gets "Označi kao započet". *(static)*

### Job lifecycle (Tier 3 group 1)
- [x] **Status enum** — seven values: `'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'closed' | 'disputed'`. *(static)*
- [x] **`PATCH /api/jobs/:id/status`** — auth + Zod. Controller looks up `(from, to)` in `backend/src/constants/jobStatusTransitions.ts` (the matrix from [[01-decisions/012-job-status-enum-extension]] extracted into the constant the ADR mandated). Actor enforcement: client must be `job.userId`; worker must be `job.assignedWorkerId`; `either` accepts both. `system` / `admin` actors are unreachable through the endpoint. Required-reason transitions (cancel, dispute) reject without a `reason`. *(static)*
- [x] **Lifecycle stamps** — `Job.completedAt` set on transition to `completed`; `Job.cancelledAt` + `Job.cancelReason` set on transition to `cancelled`. *(static)*
- [x] **`Job.expiresAt`** — Mongoose schema default `createdAt + 30d`. Existing rows have `null` and are treated as "no expiry" per ADR 010. *(static)*

### Reviews & profiles (Tier 3 group 2)
- [x] **`Review` model** — `jobId` + `reviewerId` + `revieweeId` + `rating` (1–5) + optional `comment` (max 1000). Unique compound `{ jobId, reviewerId }`; separate index on `{ revieweeId }`. *(static)*
- [x] **`POST /api/reviews`** — auth + Zod. Server derives `reviewerId` from `req.user.id` and `revieweeId` from the other job participant. 404 / 403 / 409 mapped from typed errors. 409s: not-completed (`'Recenzija je moguća tek kada je posao završen'`), not-a-participant via 403 (`'Niste učestvovali u ovom poslu'`), duplicate (`'Već ste ostavili recenziju za ovaj posao'`). *(live — covered by [backend/src/__tests__/reviews.test.ts](backend/src/__tests__/reviews.test.ts))*
- [x] **`GET /api/reviews?userId=`** — public. Returns reviews about that user, sorted newest first, reviewer + job populated. *(static)*
- [x] **`GET /api/users/:id`** — public, per [[01-decisions/013-public-user-route-shape]]. Sanitized projection `{ id, name, role, skills, rating: { average, count } }`. 404 on invalid ObjectId or missing user. Address intentionally not selected. *(live)*
- [x] **`WorkerProfileView.vue`** mounted at `/users/:id`. Header + skills chips + embedded reviews list. Public (no auth guard). *(static)*
- [x] **`JobReviews.vue`** rewired from orphan stub to a real list component (`Review[]` prop, reviewer link, star glyphs, formatted date). *(static)*
- [x] **`ReviewModal.vue`** — star-picker + comment textarea (max 1000). Same overlay pattern as `StatusReasonModal.vue`. *(static)*
- [x] **"Ostavi recenziju" entry on JobBidsView** — gated by participant + `status === 'completed'` + not-already-reviewed. Worker names in the bid list are now `<router-link>`s to the profile. *(static)*

### Search, filtering & categories (Tier 3 group 3)
- [x] **`Job.type` enum** — `['keramika','stolarija','elektrika','vodoinstalater','molerski_poslovi','ostalo']` via [backend/src/constants/jobTypes.ts](backend/src/constants/jobTypes.ts). Display labels in [frontend/src/constants/jobTypes.ts](frontend/src/constants/jobTypes.ts) (`JOB_TYPE_LABEL_SR` + `jobTypeLabel(key)`). All four UI surfaces that render `job.type` wrap with `jobTypeLabel`. RegisterView skills dropdown uses the same keys. *(static)*
- [x] **`GET /api/jobs` filters** — `?type=…&location=…&priceMin=…&priceMax=…&status=…`. Query validated by `getJobsQuerySchema` via the new `validateQuery(...)` middleware (sibling of `validate`). AND composition. `location` is case-insensitive substring (regex-escaped). Per [[01-decisions/014-job-categories-enum]] + the search-and-filtering wiki. *(live — covered by [backend/src/__tests__/jobs.filter.test.ts](backend/src/__tests__/jobs.filter.test.ts))*
- [x] **Cursor pagination on `GET /api/jobs`** — `?limit=` (default 20, max 100) + `?cursor=`. Response envelope `{ items, nextCursor }`. Cursor encodes `{ c: createdAt, i: _id }` as base64; sort `{ createdAt: -1, _id: -1 }`. Bad cursor → 400 `'Nevažeći cursor'`. Other list endpoints (`/jobs/:id/bids`, `/bids`) stay un-paginated. Per [[01-decisions/015-cursor-pagination-shape]]. *(live)*
- [x] **Job indexes** — `{ status: 1, createdAt: -1 }`, `{ type: 1 }`, `{ userId: 1 }` added per the architecture-follow-ups indexing-review trigger. *(static)*
- [x] **HomeView filter bar** — category select + location + price min/max + "Primeni"/"Resetuj". URL persistence via `?type=…` etc.; back/forward + refresh both preserve filters. "Učitaj još" appends pages from `nextCursor`. *(static)*
- [x] **JobsView client tab adapted to envelope** — reads `response.data.items` with `limit=100`. Pagination UI not wired on this tab in V1. *(static)*

### Security hardening (Tier 3 group 4)
- [x] **Helmet + CSP** — `helmet` mounted as first middleware in `app.ts`. CSP whitelists `CLIENT_ORIGIN` in `connect-src`; `style-src 'unsafe-inline'` for Bootstrap; `frame-ancestors 'none'`; `object-src 'none'`. Defaults for HSTS / X-Frame-Options / nosniff / referrer-policy kept. *(static — verified via header inspection)*
- [x] **Per-route rate limiting** — `express-rate-limit` instances in `backend/src/middleware/rateLimit.ts`: login 10/15min/IP, register 5/hr/IP, job-create 20/hr/IP, bid-submit 30/hr/IP. 429 + `'Previše zahteva, pokušajte ponovo kasnije.'`. Test-mode no-op so the suite doesn't trip thresholds. *(static)*
- [x] **HTML sanitization** — `stripHtml` from `backend/src/utils/sanitizeText.ts` applied as Zod `.transform()` on `Bid.message`, `Job.description`, `Review.comment`, `Job.cancelReason`. Strips tags + script content; trims. *(live — covered by `bid-edit-withdraw.test.ts` "HTML in bid message" + `job-delete-and-status.test.ts` "HTML in reason")*
- [x] **Min/max guards** — `Bid.amount` and `Job.price` clamped to `[1, 10_000_000]` RSD via Zod; `Job.location` max 200; `Job.description` max 5000. 400 + `errors.{field}` payload. *(live — covered by `bid-edit-withdraw.test.ts` "amount min/max guards")*
- [x] **Pending-bid cap** — `bidsService.createBid` rejects an 11th pending bid by the same worker with 409 `'Dostigli ste maksimalan broj aktivnih ponuda (10).'`. *(live — covered by `bid-edit-withdraw.test.ts`)*
- [x] **Production env-var guard** — `server.ts` throws at startup if `JWT_SECRET` / `CSRF_SECRET` / `MONGODB_URI` / `CLIENT_ORIGIN` are missing under `NODE_ENV=production`. Dev deploy checklist documented in [[wiki/security-hardening]]. *(static)*
- [x] **Structured logging** — pino + pino-http. Single logger in `backend/src/utils/logger.ts`; pino-pretty off-prod, silent in test. Cookie/Authorization/CSRF header values redacted. Explicit event lines on `auth.login.success`, `auth.login.failure`, `auth.register.success`, `bid.accepted`, `server.listening`, `mongo.connected`. Global error handler uses `logger.error`. *(static)*

### Job lifecycle polish (Tier 3 group 4)
- [x] **DELETE /api/jobs/:id** — `requireAuth` + `validate(deleteJobSchema)` + `jobsService.softDeleteJob` (thin wrapper over `transitionJobStatus(... 'cancelled', reason ?? 'Obrisano od strane vlasnika')`). Optional `{ reason }` body, HTML-stripped. Returns 200 + the updated job. Pending bids cascade to `expired` via the existing cancel-cascade. Per ADR 012 "cancelled is a soft-delete in disguise" — no `deletedAt`. 403/409 via the matrix actor check. *(live — covered by `job-delete-and-status.test.ts`, 6 tests)*

### Polish (Tier 3 group 4)
- [x] **Serbian error strings everywhere** — `'Server error'` → `'Serverska greška'` across all controllers + global handler. `'Invalid user data'` → `'Neispravni podaci korisnika'`. `'JWT_SECRET not configured'` → `'JWT_SECRET nije konfigurisan'`. *(static — grep clean)*
- [x] **About / Contact stubs removed** — `AboutView.vue` and `ContactView.vue` deleted; router imports + route entries dropped; NavBar links dropped. `vue-tsc --noEmit` clean. *(static — grep clean)*

### Test harness (Tier 3 group 1 — seed; extended group 2; extended group 3; extended group 4)
- [x] **Vitest + supertest + mongodb-memory-server installed.** Config in `backend/vitest.config.ts`; setup in `backend/src/__tests__/setup.ts` (env vars, in-memory Mongo lifecycle, per-test collection wipe). Helpers in `backend/src/__tests__/helpers.ts` (`registerAndLogin`, `createJob`, `submitBid`, `acceptBid`, `transitionJobStatus`, `withCsrf`, `deleteJob`, `unauthedRequest`). Tests live inside `src/` per [[01-decisions/008-seed-script-inside-src]]. *(live — `npm test` green)*
- [x] **`backend/src/server.ts`** — split from `app.ts` so supertest can import the configured express app without the listener starting. `dev` script switched to `ts-node-dev src/server.ts`. *(live)*
- [x] **`vitest.config.ts isolate: false`** — per-file module isolation was re-running the model files against the cached `mongoose` instance and throwing `OverwriteModelError`. Disabling isolation shares the module graph across test files; DB state stays clean via the per-test collection wipe. *(live — 43 tests across 8 files after group 4)*
- [x] **8 test files cover the marketplace loop end-to-end**: `bids.accept-race.test.ts` (concurrent accept), `reviews.test.ts` (review happy + sad), `jobs.filter.test.ts` (filter + cursor pagination + lazy expiry), `bidding-loop.test.ts` (full register→post→bid→accept), `auth.negative.test.ts` (CSRF + role boundaries), `csrf.test.ts` (CSRF guards), `bid-edit-withdraw.test.ts` (edit/withdraw/cap/min-max/sanitize), `job-delete-and-status.test.ts` (DELETE + worker status transitions). *(live)*

### Topology / hygiene
- [x] **Single-backend topology** — Express + MongoDB on `:5000`. Zero references to `localhost:3000` and zero direct `axios.*` calls outside `api.ts`. *(live + grep)*
- [x] **Environment hygiene** — `backend/.env` holds `MONGODB_URI`, `PORT`, `JWT_SECRET`, `CSRF_SECRET`, `CLIENT_ORIGIN`, loaded via `import 'dotenv/config'`. `.env` is gitignored; `.env.example` keeps the keys. *(static)*
- [x] **Credentialed CORS** — `cors({ origin: CLIENT_ORIGIN, credentials: true })`. Wildcard origin is forbidden with credentials, so the dev origin (`localhost:5173`) is explicit. *(live)*
- [x] **Frontend type contract centralised** — `frontend/src/types/index.ts` defines `Job`, `Bid`, `User` with the new shape; views import from there. *(static)*
- [x] **Seed script** — `npm run seed` in `backend/` drops the DB and inserts one client + one worker + one open job. Reuses `usersService.createUser` so bcrypt path matches login. *(live)*

---

## ⚠️ Soft

Cosmetic UI gating only — server enforcement now covers all mutating endpoints (Tier 2). These items hide controls in the UI but don't add security; a direct URL still works for *viewing* if the user is logged in.

- [x] **Vue Router auth guards** — `requiresAuth` still consults the localStorage cache for instant gating to avoid a redirect flash. Real enforcement is `requireAuth` on the server. *(static, cosmetic)*
- [x] **NavBar role visibility** — "Postavi posao" only renders for `user?.role === 'client'`; `/jobs` link label switches by role. Cosmetic. *(static)*
- [x] **JobsTable `canBid` gating** — button hidden unless `role === 'worker'` AND `job.userId !== currentUserId` AND `job.status === 'open'`. Cosmetic. *(static)*
- [x] **JobBidsView `canAccept` gating** — "Prihvati" button hidden unless `currentUser.id === job.userId` AND `bid.status === 'pending'` AND `job.status === 'open'`. Cosmetic. *(static)*

---

## ❌ Broken

Nothing currently broken.

---

## 🟡 Missing

Features the app should have but doesn't. **All items below are now scheduled in [[project-plan]]** (Tier 3 / Tier 4 / Tier 5 / Deferred); this section remains as the factual "what's not built" list rather than the to-do list.

### Security (Tier 2 — shipped, follow-ups)
- [ ] **Refresh tokens** — current JWT is access-only (7-day expiry, no rotation). Locked decision; revisit with real users.
- [ ] **Production secrets** — `.env` ships with dev placeholders for `JWT_SECRET` / `CSRF_SECRET`. Code now fails fast in production when missing (see `server.ts`), and `[[wiki/security-hardening]]` documents the deploy-time checklist. Pending operator action when we actually deploy.

### Domain completeness (Tier 3)
- [ ] **Worker profile-edit UI** — `WorkerProfileView.vue` reads only; workers can't change their skills after registration. Tracked in [[wiki/features/worker-profiles]].
- [ ] **Client profile UX** — `GET /api/users/:id` returns client users too, but no frontend view renders client profiles distinctly today.
- [ ] **`expiresAt` override in PostJobView** — default is server-side 30d; no client-facing date picker yet.
- [ ] **Address collection** — `User.address` schema field exists but RegisterView has no input. Deferred per [[01-decisions/013-public-user-route-shape]].
- [ ] **Skill-default filter for workers on HomeView** — deferred from group 3. Wiki suggests auto-prefilling type filter from `User.skills[]`.
- [ ] **Pagination on `/jobs/:id/bids` and `/bids`** — un-paginated today; lift the cursor pattern from `listJobs` when either grows past ~50 items.
- [ ] **JobsView client tab pagination** — caps at 100 posted jobs via explicit `limit=100`. Wire pagination UI if a single client ever exceeds it.
- [ ] **Free-text description search** — TODO in [[wiki/features/search-and-filtering]]; would need Mongo `$text` indexes or a dedicated engine.

### Blue-collar essentials (Tier 4)
- [ ] **Photo uploads** on job posts.
- [ ] **Map / geocoded location** — `location` is a free-text string.
- [ ] **PWA / offline support** — no service worker.
- [ ] **Push notifications** — no notification channel.

### Polish
- [ ] **`frontend/src/services/jobs.service.ts`** — still unused by views (its `getAllJobs` + `startPolling` survive; stale take-job methods deleted). Decide: wire it up or remove.

---

## Links

- [[index]] — file map + note index
- [[project-overview]] — architecture, endpoints, data models, marketplace loop
- [[project-plan]] — prioritized roadmap (where these gaps get scheduled)
- [[worklog]] — chronological history
