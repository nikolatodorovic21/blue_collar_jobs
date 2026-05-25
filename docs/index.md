---
title: Index
type: index
status: living
updated: 2026-05-25c
---

# Index

> The map. Use this to find your way around the codebase and the vault. **New here?** Read [[project-overview]] for architecture and [[app-state-audit]] for current state.

**Tech stack at a glance:** Vue 3 + Vite + TS (frontend) / Express 5 + Mongoose + MongoDB (backend) / one server on `:5000`. Full table in [[project-overview]].

---

## Notes in this vault

| Note | Purpose | When to read |
|---|---|---|
| [[index]] | This file. Codebase map + note index. | First, when you're new. |
| [[project-overview]] | Architecture, tech stack, API endpoints, data models, frontend routes, marketplace loop. The reference. | When you need to know how something is wired or what an endpoint expects. |
| [[app-state-audit]] | Current factual state — works / soft / broken / missing. Living checkboxes. | When you need to know what's true today. |
| [[project-plan]] | Prioritized roadmap. Bidding pivot, tiers, open questions. | When deciding what to do next. |
| [[worklog]] | Append-only session log. Newest at top. | When you want to know what happened, when, and why. |

## Folders

| Folder | Holds | Read when… |
|---|---|---|
| [01-decisions/](01-decisions/) | Architecture Decision Records (ADRs) — one note per significant decision, with Context / Decision / Consequences. Numbered `NNN-kebab-title.md`. | Investigating *why* something is the way it is; before proposing a change that would contradict a past decision. |
| [02-skills/](02-skills/) | Coding standards the codebase **actually follows** right now. [[skills-framework]] indexes them. | Before adding a new endpoint, schema, or feature — match the existing grain. |

---

## Codebase structure

```
poslovi/
├── backend/
│   ├── .env                    ← MONGODB_URI, PORT, JWT_SECRET, CSRF_SECRET, CLIENT_ORIGIN (gitignored)
│   ├── .env.example
│   └── src/
│       ├── app.ts              ← Express entry (port 5000) + cookie/CSRF/CORS wiring
│       ├── config/
│       │   └── db.ts           ← MongoDB connection (reads env)
│       ├── types/
│       │   └── express.d.ts    ← req.user = { id, role } augmentation
│       ├── middleware/
│       │   ├── requireAuth.ts  ← jwt.verify → req.user
│       │   ├── requireRole.ts  ← factory: requireRole('client'|'worker')
│       │   ├── validate.ts     ← Zod factory
│       │   └── csrf.ts         ← csrf-csrf double-submit
│       ├── schemas/
│       │   ├── auth.schema.ts  ← loginSchema, registerSchema (.strict)
│       │   ├── job.schema.ts   ← createJobSchema
│       │   └── bid.schema.ts   ← submitBidSchema
│       ├── models/
│       │   ├── job.model.ts    ← Job: status + userId (poster) + assignedWorkerId
│       │   ├── bid.model.ts    ← Bid: jobId, workerId, amount, message, status
│       │   └── user.model.ts   ← User: bcrypt hash + role enum
│       ├── routes/
│       │   ├── jobs.routes.ts  ← GET /:id, POST / (auth+client), GET /:id/bids (auth), POST /:id/bids (auth+worker)
│       │   ├── bids.routes.ts  ← GET / (auth+worker), PATCH /:id/accept (auth+client)
│       │   ├── users.routes.ts ← POST /api/users + Zod
│       │   └── auth.routes.ts  ← POST /login, POST /logout, GET /me
│       ├── controllers/
│       │   ├── jobs.controller.ts   ← addJob uses req.user.id
│       │   ├── bids.controller.ts   ← submit/get/accept all use req.user; getBidsForJob filters by ownership
│       │   ├── users.controller.ts  ← register issues JWT + CSRF (auto-login)
│       │   └── auth.controller.ts   ← login/logout/me; issues + clears the JWT cookie
│       ├── services/
│       │   ├── jobs.service.ts      ← getAllJobs, getJobById, createJob
│       │   ├── bids.service.ts      ← createBid, listBidsForJob, listBidsForJobByWorker, listBidsForWorker, acceptBid
│       │   ├── users.service.ts     ← createUser, findUserByEmail, findUserById
│       │   ├── auth.service.ts      ← login (bcrypt.compare), AuthError
│       │   └── token.service.ts     ← signAuthToken, setAuthCookie, clearAuthCookie
│       └── scripts/
│           └── seed.ts              ← npm run seed → wipe + insert client/worker/job
├── frontend/
│   └── src/
│       ├── main.ts
│       ├── types/
│       │   └── index.ts        ← Job, Bid, User, JobStatus, BidStatus
│       ├── router/
│       │   └── index.ts        ← Routes + auth guards (incl. /jobs/:id/bids)
│       ├── services/
│       │   ├── api.ts          ← Axios instance; bid + job endpoints
│       │   ├── jobs.service.ts ← currently unused by views
│       │   └── auth.service.ts ← login + register via api.ts
│       ├── views/              ← HomeView, JobsView (role-aware), JobBidsView,
│       │                         PostJobView, LoginView, RegisterView, About, Contact
│       └── components/         ← NavBar, JobsTable (with bid modal), JobReviews (stub)
├── docs/                       ← This Obsidian vault (gitignored)
├── CLAUDE.md                   ← Claude working memory (gitignored)
└── db.json                     ← Sample data reference (not served, schema-stale)
```

---

## Quick links into the code

| Where | Why you might want it |
|---|---|
| [backend/src/middleware/csrf.ts](../backend/src/middleware/csrf.ts) | `csrf-csrf` config — cookie name, session id, skip rules. |
| [backend/src/middleware/requireAuth.ts](../backend/src/middleware/requireAuth.ts) | The JWT verify + `req.user` setter. |
| [backend/src/services/token.service.ts](../backend/src/services/token.service.ts) | Cookie options + JWT signing in one place. |
| [backend/src/controllers/bids.controller.ts](../backend/src/controllers/bids.controller.ts) | All identity checks now use `req.user`; GET bids filters by ownership. |
| [backend/src/services/bids.service.ts](../backend/src/services/bids.service.ts) | `acceptBid` — the 3-step accept dance (this/siblings/job). |
| [backend/src/models/job.model.ts](../backend/src/models/job.model.ts) | Job: status enum + assignedWorkerId. |
| [backend/src/models/user.model.ts](../backend/src/models/user.model.ts) | `User.role` enum + bcrypt-stripping `toJSON`. |
| [backend/src/scripts/seed.ts](../backend/src/scripts/seed.ts) | `npm run seed` — wipe + seed entry point. |
| [frontend/src/services/api.ts](../frontend/src/services/api.ts) | `withCredentials`, CSRF header injection, 401 interceptor. |
| [frontend/src/services/auth.service.ts](../frontend/src/services/auth.service.ts) | `me()`, `logout()`, slim display cache. |
| [frontend/src/types/index.ts](../frontend/src/types/index.ts) | Centralised `Job` / `Bid` / `User` types. |
| [frontend/src/router/index.ts](../frontend/src/router/index.ts) | Auth guards (localStorage cache) + 401 handler. |
| [frontend/src/views/JobBidsView.vue](../frontend/src/views/JobBidsView.vue) | Client's bid-review + accept UI. |
| [frontend/src/components/JobsTable.vue](../frontend/src/components/JobsTable.vue) | Bid submit modal + status badges. |

---

## Links

- [[project-overview]] — full architecture and reference
- [[app-state-audit]] — what's true right now
- [[project-plan]] — what's next
- [[worklog]] — what happened
