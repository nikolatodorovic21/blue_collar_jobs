# State of the App — Audit Report

> **Date:** 2026-05-25
> **Auditor:** Senior Architecture Review
> **Project:** Poslovi — Blue-Collar Job Marketplace

---

## Executive Summary

The application is a **partially working proof-of-concept**. Core job listing and assignment flows function, but the authentication system is disconnected from the main backend, there is zero input validation, and no security hardening exists anywhere. The app is **not deployable** in current state.

> [!success] Resolved in Phase 0
> ~~The app runs against **two separate servers** simultaneously~~ — **fixed**.
> Auth now runs on **Express + MongoDB (:5000)** via `POST /api/users` and `POST /api/auth/login`. Passwords are bcrypt-hashed. `json-server` is no longer used. See [[project-overview]] for the current architecture.

---

## 1. Currently Implemented Features

### Fully Functional
| Feature | Files | Notes |
|---|---|---|
| Job listing | `HomeView.vue`, `api.ts` | GET `/api/jobs` works |
| Take a job | `HomeView.vue`, `api.ts` | PATCH `/api/jobs/:id` works |
| Create a job | `api.ts` | POST `/api/jobs` works (no validation) |
| Navigation + auth guards | `NavBar.vue`, `router/index.ts` | localStorage-based, functional |
| JobsTable component | `JobsTable.vue` | Clean, reusable |
| "My Jobs" view | `JobsView.vue` | Filters by userId correctly |

### Partially Implemented
| Feature | Status | Problem |
|---|---|---|
| Login | Works only with json-server on `:3000` | Hardcoded wrong port, no real token |
| Register | Works only with json-server on `:3000` | `Date.now()` for IDs, plaintext password |
| Auth service | Runs, but insecure | Compares plaintext passwords, stores full user object in localStorage |
| JobReviews component | Display-only stub | Never rendered in any view, receives no data |

### Stubs / Placeholders
| Feature | File | Status |
|---|---|---|
| About page | `AboutView.vue` | Heading + placeholder text only |
| Contact page | `ContactView.vue` | Heading + placeholder text only |
| Real-time polling | `jobs.service.ts` | Code exists but `startPolling()` is never called |

---

## 2. Tech Stack Verification

### Backend — Express 5 + TypeScript + MongoDB
- **Status: Operational, minimal**
- Express app starts and connects to MongoDB (`localhost:27017/jobs-db`)
- 3 endpoints working: `GET /api/jobs`, `POST /api/jobs`, `PATCH /api/jobs/:id`
- `dotenv` is installed but never called — `app.ts` does not call `require('dotenv').config()`
- MongoDB connection string is hardcoded in `config/db.ts`

### Frontend — Vue 3 + Vite + TypeScript
- **Status: Operational, inconsistent**
- Vite dev server runs cleanly
- Vue Router guards work
- Vuex store is configured but views bypass it — state is managed locally in each view
- `services/jobs.service.ts` is well-structured but **views call `api.ts` directly** instead

### Database Integration
| Data | Where Stored | Status |
|---|---|---|
| Jobs | MongoDB via Mongoose | Connected and working |
| Users | `db.json` via json-server | **Not in MongoDB, no Mongoose model** |
| Reviews | `db.json` via json-server | **Not in MongoDB, no Mongoose model** |

### Auth Flow (Current Reality)
```
Browser → http://localhost:3000/users?email=X  (json-server)
       ← Array of users returned with plaintext passwords
Browser compares passwords locally
User object (including password) stored in localStorage
```
There is no JWT, no session, no backend auth middleware.

---

## 3. Blue-Collar Feature Gaps

The following features are standard expectations for a field-worker job platform and are **entirely absent**:

### Critical for Field Workers
- **Offline support / PWA** — workers in the field have unreliable connectivity; no service worker, no caching, no offline queue
- **Photo uploads** — workers need to attach job completion photos; no file upload anywhere
- **Map / location integration** — no geocoding, no map view, location is a free-text string with zero validation
- **Push notifications** — no way to alert a worker when a job becomes available or is assigned
- **Job scheduling / calendar** — no date/time on jobs, no scheduling view

### Important for Business Logic
- **Job filtering and search** — no filter by type, location, price, availability; full list loads every time
- **Worker profiles** — skills exist in `db.json` but are never displayed or used in matching
- **Ratings and reviews flow** — `JobReviews.vue` exists as a stub but there's no submit form, no API endpoint, and it's never shown
- **Job status lifecycle** — only two states (`taken: true/false`); no pending, in-progress, completed, disputed

### Nice-to-Have
- Admin panel / moderation
- Messaging / chat between worker and client
- Payment integration
- PDF job receipts / invoices
- Multi-language support (UI is Serbian-only)

---

## 4. Quick Wins & Technical Debt

### Fix Immediately (before new features)

**Broken / Incorrect**
- [x] `LoginView.vue` and `RegisterView.vue` hardcode `http://localhost:3000/users` — must be updated to use the centralized `api.ts` (port 5000), and a real `/users` endpoint must be added to Express
- [ ] `api.ts` exports `getJobById()` and `getTakenJobs()` — these call endpoints (`/jobs/:id`, `/jobs?taken=true`) that **do not exist** on the Express backend *(baseURL now correct, but the endpoints themselves still need to be added)*
- [x] `auth.service.ts` queries `/users` directly — this endpoint does not exist on Express

**Security**
- [x] Passwords stored in plaintext in `db.json` and compared client-side — critical *(now bcrypt-hashed in MongoDB)*
- [ ] No auth middleware on Express — any unauthenticated request can create or modify jobs *(deferred to Phase 1 — JWT)*
- [ ] No input validation on `POST /api/jobs` — malformed data goes straight to MongoDB *(deferred to Phase 1 — Zod)*

**Configuration**
- [x] `dotenv` is installed but `require('dotenv').config()` is never called in `app.ts`
- [x] MongoDB URI is hardcoded in `config/db.ts` — should be `process.env.MONGODB_URI`
- [x] No `.env` files exist for either service

### Clean Up (technical debt)

**Dead Code**
- [x] `frontend/src/data/jobsData.ts` — never imported anywhere, delete it
- [ ] Vuex store is set up but no state is actually stored in it — either use it or remove it

**Data Model Gaps**
- [x] `Job` model missing `timestamps` (`createdAt`, `updatedAt`) and `userId` field in Mongoose schema
- [x] No Mongoose model for `User` — required before auth can be moved to Express
- [ ] No Mongoose model for `Review`

**Consistency**
- [ ] Views (`HomeView`, `JobsView`) call `api.getJobs()` directly — should use `JobsService` for consistency
- [ ] `jobs.service.ts` `startPolling()` is implemented but never called — wire it up or remove it

**Backend Missing Basics**
- [ ] No `DELETE /api/jobs/:id` endpoint
- [ ] No `GET /api/jobs/:id` endpoint
- [ ] No pagination on `GET /api/jobs`
- [ ] No error logging (errors silently return generic 500 messages)
- [ ] No security headers (no `helmet`)

---

## Priority Roadmap (Suggested Order)

```
Phase 0 — Stabilize (fix broken things, no new features)
  1. Add .env files, wire up dotenv
  2. Fix LoginView/RegisterView base URL
  3. Add User Mongoose model + POST /api/users, POST /api/auth/login endpoints
  4. Add timestamps + userId to Job model
  5. Delete dead code (jobsData.ts)

Phase 1 — Security Foundation
  1. Hash passwords (bcrypt)
  2. Implement JWT auth (login → token → middleware on all write endpoints)
  3. Add input validation (Zod on backend)

Phase 2 — Feature Completeness
  1. Job filtering/search
  2. Job status lifecycle
  3. Reviews flow (POST /api/reviews, wire JobReviews component)
  4. Worker profiles

Phase 3 — Blue-Collar Essentials
  1. Photo uploads (Multer / S3)
  2. Location with map (Leaflet or Google Maps)
  3. Push notifications
  4. PWA / offline support
```

---

## Links

- [[marketplace-loop]] — what the marketplace loop is (post → take → display)
- [[index]] — codebase structure map
- [[project-overview]] — architecture and endpoint reference
- [[phase-0-review]] — post-Phase-0 verification + recommendations for what to tackle next
