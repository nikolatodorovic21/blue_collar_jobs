# Phase 0 Review & Next Steps

> **Date:** 2026-05-25
> **Status:** Phase 0 shipped + verified live. **Option A (finish the marketplace loop) shipped 2026-05-25.** Soft role enforcement added.
> **Audience:** Anyone — including a second-opinion reviewer who has not seen the codebase. This note is self-contained.

> [!success] Option A complete
> Take-job now persists `userId`. A "Postavi posao" view exists and is wired up. Soft role enforcement (clients post, workers take, no self-take) is live on both UI and backend. Verified end-to-end with curl + Mongoose direct queries. **Soft** because auth is still localStorage — Phase 1 (JWT) is the next step.

---

## What this note is

Poslovi is a Vue 3 + Express + MongoDB **job marketplace** in Serbian. Workers (*majstori*) take jobs posted by clients (*klijenti*). [[project-overview]] has the full architecture; [[index]] has the file map; [[app-state-audit]] is the rolling audit/roadmap.

**Phase 0** was a stabilization pass that consolidated authentication onto Express + MongoDB (previously, auth ran against a separate `json-server` instance with plaintext passwords), introduced bcrypt password hashing, added a Mongoose `User` model with a `role` field, and cleaned up dead code and configuration.

The goal of **this note** is to record what was actually verified after Phase 0, what the known gaps are (in particular the client/worker role distinction, which is central to a marketplace), and to lay out options for what to do next so the choice can be made deliberately rather than by inertia.

---

## Verified state — what genuinely works

Verified by **live runtime test** (curl + direct Mongoose queries against the dev DB) where noted, otherwise by static code trace.

- **Registration** ([users.controller.ts:5](../backend/src/controllers/users.controller.ts#L5) → [users.service.ts:6](../backend/src/services/users.service.ts#L6)) — *live-tested*
  - Required fields `email`, `password`, `name`, `role` are validated.
  - `role` is enum-restricted to `'worker' | 'client'` at the schema layer ([user.model.ts:17](../backend/src/models/user.model.ts#L17)).
  - Password is bcrypt-hashed with 10 salt rounds before save. **Confirmed live:** stored value matches `$2b$10$…`.
  - `toJSON` on the User schema strips `password` so it never leaves the backend.
  - Duplicate email returns `409` with a Serbian-language message; the frontend surfaces it correctly.

- **Login** ([auth.controller.ts:5](../backend/src/controllers/auth.controller.ts#L5) → [auth.service.ts:13](../backend/src/services/auth.service.ts#L13))
  - Lookup by email is case-insensitive (`findUserByEmail` lowercases).
  - `bcrypt.compare` is used — no plaintext comparison anywhere in the codebase.
  - Unknown user and wrong password both throw `AuthError(401)` with a generic Serbian message — no user-enumeration leakage.
  - Response excludes the password field (same `toJSON` transform).

- **Post a job (Option A)** ([PostJobView.vue](../frontend/src/views/PostJobView.vue) → [jobs.controller.ts](../backend/src/controllers/jobs.controller.ts) `addJob`) — *live-tested*
  - New `/post-job` route, NavBar link visible only to `role === 'client'`.
  - Form fields: type (dropdown), price, location, description.
  - Submitting calls `POST /api/jobs` with `{...form, userId, role}`. Backend rejects with 403 if `role !== 'client'`.
  - **Confirmed live:** job is persisted with `userId` equal to the poster's `_id`.

- **Take a job (Option A)** ([HomeView.vue](../frontend/src/views/HomeView.vue) → [jobs.controller.ts](../backend/src/controllers/jobs.controller.ts) `updateJob`) — *live-tested*
  - `PATCH /api/jobs/:id` payload now `{taken: true, userId, role}`.
  - Backend rejects 403 if `role !== 'worker'` or if `job.userId === body.userId` (no self-take).
  - **Confirmed live:** job is updated with `taken: true, userId = worker._id`, and "Moji Poslovi" filter `job.userId === currentUser.id` now matches — survives refresh because the data is in MongoDB, not in optimistic local state.

- **Single-backend topology**
  - `grep` for `localhost:3000` across `frontend/src/` returns no matches.
  - `grep` for direct `axios.*` calls outside `api.ts` returns no matches.
  - `frontend/src/services/api.ts` baseURL is `http://localhost:5000/api`.
  - `json-server` appears only in old doc references; the dependency on it is gone.

- **Environment hygiene**
  - `backend/.env` holds `MONGODB_URI` and `PORT`, loaded via `import 'dotenv/config'` at the top of `app.ts`.
  - `.env.example` exists; `.env` is gitignored.

- **Frontend type contract**
  - `Job.id`, `Job.userId`, and `User.id` are all typed as strings (ObjectId hex). The previous `Number()` coercions have been removed.

---

## Confirmed gaps & broken logic

### ~~Critical~~ — *Resolved in Option A*

1. ~~**Take-job does not persist `userId`.**~~ **RESOLVED 2026-05-25.** [jobs.controller.ts](../backend/src/controllers/jobs.controller.ts) now reads `userId` from `req.body` and forwards it to [jobs.service.ts](../backend/src/services/jobs.service.ts) `takeJob(id, userId)`, which persists it in the `findByIdAndUpdate` payload. Verified live: the field is stored as `ObjectId` and survives refresh.

2. ~~**There is no UI to post a job.**~~ **RESOLVED 2026-05-25.** [PostJobView.vue](../frontend/src/views/PostJobView.vue) is the new "Postavi posao" view, routed at `/post-job` and linked from the NavBar (visible only to clients). Uses the `addJob` helper from `api.ts`. Verified live: a client can post and the resulting document has `userId = client._id`.

### High — security & correctness

3. **No backend auth middleware.**
   - `POST /api/jobs`, `PATCH /api/jobs/:id`, `POST /api/users`, and `POST /api/auth/login` are all open to unauthenticated requests. There is no JWT, no session cookie, no API key.
   - The Vue Router's `requiresAuth` guard only checks for the presence of `user` in `localStorage`. Setting it manually from DevTools (`localStorage.setItem('user', '{"id":"x","role":"worker"}')`) is enough to bypass every guard. The backend never re-validates.
   - The new role checks in `jobs.controller.ts` (Option A) trust the `role` field in the request body. **This is soft enforcement**: a hand-crafted curl with `role: 'worker'` passes regardless of who is logged in. Real enforcement waits for Phase 1 (JWT).

4. ~~**No role-based authorization.**~~ **PARTIALLY RESOLVED (soft).** Backend now rejects `POST /api/jobs` when `role !== 'client'` (403), rejects `PATCH /api/jobs/:id` when `role !== 'worker'` (403), and rejects self-take (403). UI hides "Postavi posao" from non-clients and hides "Preuzmi" from non-workers / own jobs. **Still trusts the client's claim of role** — see Gap #3.

5. **No input validation on `POST /api/jobs`.**
   - The controller passes `req.body` straight to Mongoose. Mongoose checks required fields, but there's no schema validation library (Zod, Joi, etc.) — no length limits, no price sanity check, no enum on `type`.

### Medium — logic / UX gaps

6. ~~**A user can take their own posted job.**~~ **RESOLVED (soft).** Backend `updateJob` looks up the existing job and rejects 403 if `existing.userId.toString() === body.userId`. UI also hides the button when `job.userId === currentUserId`.

7. **Concurrent takes are unprotected.** Two workers clicking "Preuzmi" on the same job will both succeed (no conditional update, no version field). Last write wins.

8. **No `Review` Mongoose model.** Reviews exist as a UI component stub and as JSON in `db.json`, but the model hasn't been created. The rating/feedback loop is entirely missing.

9. **Error messages are inconsistent.** 400 responses (missing required field) are in English; 401/409 responses are in Serbian. Minor UX issue.

---

## The role distinction *(post-Option-A)*

After Option A, the role distinction is enforced at three layers — but **only one of them is tamper-resistant**, and it's the weakest, because real auth doesn't exist yet.

| Layer | Enforced? | Tamper-resistant? |
|---|---|---|
| Mongoose schema (`User.role` enum) | ✅ | ✅ |
| UI (NavBar hides "Postavi posao", JobsTable hides "Preuzmi") | ✅ | ❌ (DevTools `localStorage.setItem`) |
| Backend role check in `jobs.controller.ts` | ✅ | ❌ (curl with arbitrary `role` field) |

The backend now **does** enforce role on every mutating endpoint, but it trusts the role string the client sends. That's enough to keep an honest UI honest. It is **not** enough to keep an attacker out. Phase 1 (JWT) replaces this with server-signed claims.

---

## Options for what to tackle next

Three coherent directions. They're not mutually exclusive, but the order matters.

### ~~Option A — Finish the marketplace loop~~ *(shipped 2026-05-25)*

All four bullets shipped:
- ✅ `userId` is forwarded through the controller and persisted in the service.
- ✅ "Post Job" view + route exist; restricted to `client` role on both UI and backend.
- ✅ Soft role enforcement on both `POST /api/jobs` and `PATCH /api/jobs/:id`. No-self-take is checked server-side.
- ✅ "Preuzmi" button is hidden from non-workers and from own jobs.

### Option B — Phase 1 security (JWT + Zod) *(now next)*

The original audit's next phase.

- Replace localStorage-only auth with a JWT signed by the backend, returned on login/register, stored client-side, and required as a `Bearer` header on protected endpoints.
- Add Zod schemas for every request body; reject malformed input before it hits Mongoose.
- Add a small `requireAuth` middleware and a `requireRole('client' | 'worker')` middleware. (This naturally absorbs Option A's role enforcement if A hasn't shipped yet.)

Roughly **3–5 days.** Adds the auth middleware story properly. **But:** without Option A, JWT is securing flows that don't have meaningful business logic to protect yet. Securing a broken loop is theatre.

### Option C — Blue-collar feature push (photo upload, map, PWA)

The flashy "make it feel like a field-worker tool" phase from the audit.

- Photo uploads (Multer + local disk or S3)
- Map / geocoded location (Leaflet)
- PWA + service worker for offline support
- Push notifications

Roughly **1–2 weeks of meaningful work, plus design.** Strong demo value. Builds on top of A and B; doing it before them piles UX on top of a system that still doesn't enforce its own rules.

---

## Recommendation *(post-Option-A)*

Option A is done. The marketplace contract now exists at the application layer, but it's soft — anyone willing to hand-craft a request can bypass it. **Phase 1 (Option B)** is the right next move: replace the trust-the-client `role` field with a server-signed JWT and add a `requireRole` middleware. Zod schemas should ride along.

Order of next phases stays: B → C.

---

## Open question for the reviewer

With Option A shipped, the loop demos end-to-end but is not securable yet. The decision now is whether to **harden** (Option B — JWT + Zod) before any blue-collar feature work, or to **demo and gather feedback** first (Option C — photo upload, map) and absorb the security tax later. Recommended: harden first; demo-then-harden tends to leak demo features that depend on soft assumptions.

---

## Links

- [[marketplace-loop]] — one-page explainer of post → take → display (read this first if new)
- [[index]] — codebase file map
- [[project-overview]] — architecture, endpoints, data models
- [[app-state-audit]] — full audit + roadmap (Phase 0 progress is tracked there as checkboxes)
