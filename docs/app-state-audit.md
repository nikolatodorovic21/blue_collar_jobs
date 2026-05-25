---
title: App State Audit
type: audit
status: living
updated: 2026-05-25b
---

# App State Audit

> Single source of truth for **what's true about the running app right now.** Architecture and endpoint reference lives in [[project-overview]]; the roadmap in [[project-plan]]; chronological history in [[worklog]].
>
> Each item below is verified either live (`live` — exercised via curl + DB inspection or browser) or by static code trace (`static`). Update checkboxes as work lands.

**Last verified:** 2026-05-25

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

### Jobs
- [x] **Post a job** — `POST /api/jobs` requires `requireAuth` + `requireRole('client')` + Zod validation; `userId` is set from `req.user.id` (token, not body). Job starts with `status: 'open'`. *(live)*
- [x] **Get all jobs** — `GET /api/jobs` returns all jobs with the new `status` + `assignedWorkerId` shape. *(live)*
- [x] **Get one job** — `GET /api/jobs/:id` returns the job or 404. *(live)*

### Bidding (Tier 1)
- [x] **Submit a bid** — `POST /api/jobs/:id/bids` (requires auth + `worker` role + Zod). `workerId` is from `req.user.id`; 403 self-bid, 409 job-not-open. *(live)*
- [x] **List bids for a job** — `GET /api/jobs/:id/bids` (auth required). Job owner sees all bids with worker `name` populated; non-owners see only their own bid for that job. *(live)*
- [x] **Worker's own bids** — `GET /api/bids` (auth + `worker` role). Returns `req.user.id`'s bids; query params ignored. *(live)*
- [x] **Accept a bid** — `PATCH /api/bids/:id/accept` (auth + `client` role). Ownership is checked against `req.user.id` vs `job.userId`. Flips chosen bid → `accepted`, siblings → `rejected`, job → `assigned` with `assignedWorkerId`. *(live — confirmed via curl + DB)*
- [x] **"Postavi ponudu" UI** — workers see the button on open jobs they don't own; modal collects amount + optional message. *(live, served via Vite)*
- [x] **"Moje ponude" UI** — worker route `/jobs` shows their bids with status badges. *(static — DOM compiles, end-to-end click-through not run by the agent)*
- [x] **"Ponude na moj posao" UI** — client route `/jobs/:id/bids` shows all bids with per-bid "Prihvati" buttons gated on ownership + status. *(static)*

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

Features the app should have but doesn't.

### Security (Tier 2 — shipped, follow-ups)
- [ ] **Refresh tokens** — current JWT is access-only (7-day expiry, no rotation). Locked decision; revisit with real users.
- [ ] **Helmet / rate-limiting / security headers** — not in the Tier 2 scope; separate hardening pass.
- [ ] **Production secrets** — `.env` ships with dev placeholders for `JWT_SECRET` / `CSRF_SECRET`. Must be replaced before any non-local deploy.

### Bidding polish
- [ ] **Bid editability** — workers can't update their `amount`/`message` before the client accepts (open question in [[project-plan]]).
- [ ] **Bid expiry** — no expiry; pending bids live forever if the client never accepts.
- [ ] **Concurrent-accept protection** — `acceptBid` does 3 sequential updates, no transaction. Two simultaneous accepts on different bids would race; last write wins. Acceptable for now ([[project-plan]] Tier 3).

### Domain completeness (Tier 3)
- [ ] **`Review` Mongoose model + endpoints** — `JobReviews.vue` exists as an orphaned stub.
- [ ] **Job filtering / search** — `GET /api/jobs` returns everything; no filters server-side.
- [ ] **Job lifecycle beyond `assigned`** — enum includes `completed` and `closed` but no UI transitions yet.
- [ ] **Worker profile pages** — `skills[]` collected at registration but never displayed.

### Blue-collar essentials (Tier 4)
- [ ] **Photo uploads** on job posts.
- [ ] **Map / geocoded location** — `location` is a free-text string.
- [ ] **PWA / offline support** — no service worker.
- [ ] **Push notifications** — no notification channel.

### Polish
- [ ] **Inconsistent error language** — most messages are Serbian, but a few (`Server error`, `Invalid job data`, `Invalid bid data`) remain English.
- [ ] **`DELETE /api/jobs/:id`** endpoint doesn't exist.
- [ ] **About / Contact pages** are placeholder stubs.
- [ ] **`frontend/src/services/jobs.service.ts`** — still unused by views (its `getAllJobs` + `startPolling` survive; stale take-job methods deleted). Decide: wire it up or remove.

---

## Links

- [[index]] — file map + note index
- [[project-overview]] — architecture, endpoints, data models, marketplace loop
- [[project-plan]] — prioritized roadmap (where these gaps get scheduled)
- [[worklog]] — chronological history
