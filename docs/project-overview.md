# Project Overview — Poslovi

> Job marketplace connecting workers (*majstori*) and clients (*klijenti*) for home/construction services. **New here?** Read [[marketplace-loop]] first for what the app actually does.

---

## Architecture

```
monorepo/
├── backend/    # Node.js + Express REST API
├── frontend/   # Vue 3 SPA
├── docs/       # This Obsidian vault
└── db.json     # Local sample data (not used in prod)
```

- **Pattern:** REST API (backend) consumed by a SPA (frontend) via Axios
- **Auth:** Express + MongoDB. Registration creates a bcrypt-hashed user; login compares with `bcrypt.compare`. The returned user (without password) is stored in `localStorage` and Vue Router guards check for its presence. **No JWT yet** — that's Phase 1. `json-server` is no longer used.
- **Database:** MongoDB (`jobs-db` at `localhost:27017`); `db.json` retained only as sample data reference

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js + TypeScript 6 |
| Backend framework | Express 5.1 |
| ODM | Mongoose 8.15 |
| Frontend framework | Vue 3.5 + TypeScript 5.8 |
| Build tool | Vite 6.2 |
| State management | Vuex 4 |
| Routing | Vue Router 4.5 |
| HTTP client | Axios 1.9 |
| UI | Bootstrap 5.3 |

**Dev servers:**
- Backend: `http://localhost:5000` (`npm run dev` in `backend/`) — env from `backend/.env`
- Frontend: `http://localhost:5173` (`npm run dev` in `frontend/`)

> Frontend `api.ts` `baseURL` is `http://localhost:5000/api`. All requests resolve correctly against `/api/*` routes.

---

## API Endpoints

Base path: `/api`

| Method | Path | Description | Response |
|---|---|---|---|
| `GET` | `/api/jobs` | Fetch all jobs | `200 Job[]` |
| `POST` | `/api/jobs` | Create a new job. Body: `{type, price, location, description, userId, role}`. Soft role check: rejects 403 if `role !== 'client'` | `201 Job` / `403` |
| `PATCH` | `/api/jobs/:id` | Mark a job as taken. Body: `{taken: true, userId, role}`. Soft role check: rejects 403 if `role !== 'worker'` or if the requester is the poster (self-take) | `200 Job` / `403` / `404` |
| `POST` | `/api/users` | Register a new user (bcrypt-hashes password) | `201 User` (no password field) |
| `POST` | `/api/auth/login` | Verify credentials with bcrypt | `200 User` (no password field) / `401` |

> The `role` field on `POST /api/jobs` and `PATCH /api/jobs/:id` is **trusted from the request body** — this is soft enforcement only. Real enforcement waits for Phase 1 (JWT). See [[phase-0-review]] for the layered enforcement table.

**Source files:**
- Jobs — `backend/src/routes/jobs.routes.ts`, `controllers/jobs.controller.ts`, `services/jobs.service.ts`
- Users — `backend/src/routes/users.routes.ts`, `controllers/users.controller.ts`, `services/users.service.ts`
- Auth — `backend/src/routes/auth.routes.ts`, `controllers/auth.controller.ts`, `services/auth.service.ts`

---

## Data Models

### Job
*Mongoose schema — persisted to MongoDB*

| Field | Type | Notes |
|---|---|---|
| `type` | `string` | Job category (e.g. Keramika, Elektrika) |
| `price` | `number` | Price in RSD |
| `location` | `string` | Work location / city |
| `description` | `string` | Detailed job description |
| `taken` | `boolean` | Default `false`; `true` when assigned |
| `userId` | `ObjectId` | Ref to `User`. Optional — unset on free jobs |
| `createdAt` | `Date` | Added via `{ timestamps: true }` |
| `updatedAt` | `Date` | Added via `{ timestamps: true }` |

> **Note:** `userId` is an ObjectId reference. Serialized as a 24-char hex string. The frontend stores `user.id` (also the stringified ObjectId) and compares as a string.

### User
*Mongoose schema — persisted to MongoDB ([backend/src/models/user.model.ts](../backend/src/models/user.model.ts))*

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
*Present in `db.json` — no Mongoose model yet*

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique identifier |
| `jobId` | `number` | Reference to Job |
| `userId` | `number` | Reference to User |
| `rating` | `number` | Star rating (1–5) |
| `comment` | `string` | Review text |
| `createdAt` | `string` | ISO date string |

---

## Frontend Routes

| Path | View | Guard |
|---|---|---|
| `/` | `HomeView` — all available jobs | `requiresAuth` |
| `/jobs` | `JobsView` — worker's taken jobs | `requiresAuth` |
| `/post-job` | `PostJobView` — create a new job | `requiresAuth` + in-view `role === 'client'` (redirects otherwise) |
| `/about` | `AboutView` | `requiresAuth` |
| `/contact` | `ContactView` | `requiresAuth` |
| `/login` | `LoginView` | `guestOnly` |
| `/register` | `RegisterView` | `guestOnly` |

---

## Known Issues / TODOs

- [x] Fix port mismatch: `frontend/src/services/api.ts` should point to `:5000` *(now `:5000/api`)*
- [x] Hash passwords — currently stored in plaintext in `db.json` *(bcrypt, Phase 0)*
- [ ] Add Mongoose model for `Review` *(User done in Phase 0)*
- [ ] Add `DELETE /api/jobs/:id` endpoint
- [ ] Implement server-side authentication (JWT or sessions) — **Phase 1**
- [ ] Add input validation (Zod) — **Phase 1**

See [[app-state-audit]] for the full Phase 0 progress tracker.
