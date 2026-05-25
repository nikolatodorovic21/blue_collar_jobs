# Codebase Index

> Quick-reference map of the Poslovi project. See [[project-overview]] for full details. New to the codebase? Start with [[marketplace-loop]].

---

## Structure

```
poslovi/
├── backend/
│   ├── .env                    ← MONGODB_URI, PORT (gitignored)
│   ├── .env.example
│   └── src/
│       ├── app.ts              ← Express entry point (port 5000)
│       ├── config/
│       │   └── db.ts           ← MongoDB connection (reads env)
│       ├── models/
│       │   ├── job.model.ts    ← Mongoose Job schema (timestamps + userId)
│       │   └── user.model.ts   ← Mongoose User schema (bcrypt hash)
│       ├── routes/
│       │   ├── jobs.routes.ts
│       │   ├── users.routes.ts ← POST /api/users (register)
│       │   └── auth.routes.ts  ← POST /api/auth/login
│       ├── controllers/
│       │   ├── jobs.controller.ts
│       │   ├── users.controller.ts
│       │   └── auth.controller.ts
│       └── services/
│           ├── jobs.service.ts
│           ├── users.service.ts  ← createUser (hashes), findUserByEmail
│           └── auth.service.ts   ← login (bcrypt.compare)
├── frontend/
│   └── src/
│       ├── main.ts             ← Vue app entry
│       ├── router/
│       │   └── index.ts        ← Routes + auth guards
│       ├── services/
│       │   ├── api.ts          ← Axios instance (baseURL :5000/api)
│       │   ├── jobs.service.ts
│       │   └── auth.service.ts ← login + register via api.ts
│       ├── views/              ← Page components (7, incl. PostJobView.vue)
│       └── components/         ← Reusable UI (3)
├── docs/                       ← This Obsidian vault
└── db.json                     ← Sample data reference (no longer served)
```

---

## Tech Stack

| Layer | Tech | Version |
|---|---|---|
| Backend framework | Express | 5.1 |
| Backend language | TypeScript | 6.0 |
| ODM | Mongoose | 8.15 |
| Database | MongoDB | local |
| Frontend framework | Vue | 3.5 |
| Build tool | Vite | 6.2 |
| State | Vuex | 4.0 |
| Router | Vue Router | 4.5 |
| HTTP client | Axios | 1.9 |
| UI | Bootstrap | 5.3 |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/jobs` | All jobs |
| `POST` | `/api/jobs` | Create job (soft: requires `role=client` in body) |
| `PATCH` | `/api/jobs/:id` | Mark as taken (soft: requires `role=worker`, blocks self-take) |
| `POST` | `/api/users` | Register (bcrypt) |
| `POST` | `/api/auth/login` | Login (bcrypt.compare) |

---

## Data Models

### Job *(Mongoose)*
`type · price · location · description · taken · userId?(ObjectId→User) · createdAt · updatedAt`

### User *(Mongoose)*
`email · password(bcrypt hash) · name · role(worker|client) · skills[] · address? · createdAt · updatedAt`

### Review *(db.json only — no Mongoose model)*
`id · jobId · userId · rating · comment · createdAt`

---

## Frontend Routes

| Path | View | Guard |
|---|---|---|
| `/` | HomeView | requiresAuth |
| `/jobs` | JobsView | requiresAuth |
| `/post-job` | PostJobView | requiresAuth + in-view client-only |
| `/login` | LoginView | guestOnly |
| `/register` | RegisterView | guestOnly |
| `/about` | AboutView | requiresAuth |
| `/contact` | ContactView | requiresAuth |

---

## Open Issues

- [x] ~~Port mismatch: `api.ts` points to `:3000`, backend runs on `:5000`~~ — fixed (`:5000/api`)
- [x] ~~Passwords stored in plaintext in `db.json`~~ — bcrypt-hashed in MongoDB
- [x] ~~No Mongoose model for User~~ — User model created
- [ ] No Mongoose model for Review
- [ ] No server-side authentication (JWT/sessions) — **Phase 1**

---

## Links

- [[marketplace-loop]] — what the app does (post → take → display)
- [[project-overview]] — full architecture doc
- [[app-state-audit]] — Phase 0 progress tracker
- [[phase-0-review]] — post-Option-A status + next-step framing
