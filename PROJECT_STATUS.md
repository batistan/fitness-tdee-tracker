# Calometri — Project Status

## Current State

### Backend (Deno + Hono + PostgreSQL)

**Complete and functional:**

| Layer | What's built |
|-------|-------------|
| Database | PostgreSQL via Neon serverless. Drizzle ORM schema: `users`, `entries`, `sessions` tables. |
| Repositories | Full CRUD for users, entries (with date-range queries, upsert), sessions, health checks. |
| Telemetry | Structured JSON logging, request/response middleware, request ID tracing, DB query logging. |
| Auth | JWT middleware (HS256 via Hono built-in). `sub` claim carries userId. Dev token minting endpoint. |
| Entry routes | `POST`, `GET` (list + by-id + date-range), `PUT`, `DELETE` — all JWT-protected. |
| TDEE engine | Linear regression on weight trend + energy balance equation. Configurable analysis window. |
| Stats route | `GET /stats/tdee` returns computed TDEE, weight trend, averages. |
| Config | Environment-based (dev/QA/prod). Required: `DATABASE_URL`, `JWT_SECRET`. |
| Tests | Unit tests for repositories, routes (health, entries, stats), TDEE algorithm, env config. |

**Not yet built:**

- Authentication flow (register, login, logout, password hashing)
- User profile management
- Database migrations committed to repo
- CI/CD pipeline
- Docker / deployment config

### Frontend (Solid.js + Vite + Tailwind CSS)

Minimal skeleton. Only displays a health-check card. `@solidjs/router` is installed but unused. No pages, forms, or data display components exist yet.

---

## API Endpoint Reference

### Public

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Returns API status, environment, DB connection state. |

### JWT-Protected

All require `Authorization: Bearer <token>` header. The token's `sub` claim identifies the user.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/entries/` | Create or upsert a daily entry (date, weight, calories). Returns 201. |
| `GET` | `/entries/` | List entries for the authenticated user. Supports `?limit=` and `?offset=` for pagination. |
| `GET` | `/entries/range` | Get entries in a date window. Requires `?start=YYYY-MM-DD&end=YYYY-MM-DD`. |
| `GET` | `/entries/:id` | Get a single entry by ID. |
| `PUT` | `/entries/:id` | Partial update of an entry (any subset of date, weight, calories). |
| `DELETE` | `/entries/:id` | Delete an entry. |
| `GET` | `/stats/tdee` | Compute TDEE over the last N days. Supports `?days=` (default 28). Returns `currentTDEE`, `weeklyAverageWeight`, `weeklyAverageCalories`, `weightTrend`, `dataPoints`. Returns 422 if fewer than 3 entries exist in the window. |

### Dev-Only (not mounted in production)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/dev/token` | Mint a JWT. Body: `{ "userId": "<uuid>" }`. Returns `{ "token": "..." }`. |

---

## Frontend Integration Plan

### Screens and User Journeys

#### 1. Login / Register

**Screen:** `/login` and `/register` routes.

**What exists today:** Nothing. Auth endpoints don't exist yet.

**Interim approach (dev/testing):** Use the dev token endpoint to get a JWT, store it in memory or localStorage, and skip the login screen entirely. A hardcoded "dev login" button can call:

```
POST /dev/token  { "userId": "<test-user-uuid>" }
```

Store the returned `token` in a Solid.js signal or context. All subsequent API calls attach it as `Authorization: Bearer <token>`.

**Future (when auth is built):**

| Step | Screen | API Call |
|------|--------|----------|
| User opens app | `/login` | None. Check for stored token. |
| User submits registration | `/register` | `POST /auth/register` (not yet built) |
| User submits login | `/login` | `POST /auth/login` (not yet built) |
| Token stored | Redirect to `/` | — |
| User logs out | `/login` | `POST /auth/logout` (not yet built) |

---

#### 2. Dashboard (Home)

**Screen:** `/` — the main screen after login. Shows today's entry form and current TDEE stats.

**Layout:**
- Top: TDEE summary card (current TDEE, weight trend, averages)
- Middle: Today's entry form (weight + calories)
- Bottom: Recent entries list (last 7 days)

**API calls on mount:**

| Call | Purpose | When |
|------|---------|------|
| `GET /stats/tdee` | Populate the TDEE summary card. Handle 422 (not enough data) by showing an onboarding message. | On mount, and after any entry is created/updated. |
| `GET /entries/range?start=<7daysAgo>&end=<today>` | Show recent entries in a compact list below the form. | On mount. |

**User submits today's entry:**

| Step | API Call | UI Update |
|------|----------|-----------|
| User enters weight and calories, taps "Save" | `POST /entries/` with `{ date: "YYYY-MM-DD", weight: 185.5, calories: 2100 }` | Show success feedback. Re-fetch `GET /stats/tdee` to update the summary card. Append/replace the entry in the recent list. |

The `POST` endpoint upserts, so submitting again for the same date overwrites cleanly — no special "edit vs create" logic needed on this screen.

---

#### 3. Entry History

**Screen:** `/history` — scrollable list of all past entries with pagination.

**Layout:**
- Date-sorted list showing date, weight, calories per row
- "Load more" button or infinite scroll
- Tap a row to edit or delete

**API calls:**

| Call | Purpose | When |
|------|---------|------|
| `GET /entries/?limit=50&offset=0` | Initial page load. | On mount. |
| `GET /entries/?limit=50&offset=50` | Next page. | User scrolls or taps "Load more". |

**Edit flow:**

| Step | API Call | UI Update |
|------|----------|-----------|
| User taps an entry row | — | Open inline edit form or modal pre-filled with current values. |
| User changes values, taps "Save" | `PUT /entries/:id` with changed fields | Update the row in-place. |
| User taps "Delete" | `DELETE /entries/:id` | Remove the row. Show confirmation first. |

---

#### 4. TDEE Trends / Stats

**Screen:** `/stats` — deeper view of TDEE trends over time.

**Layout:**
- TDEE stat card (same as dashboard but larger)
- Time window selector (7 / 14 / 28 / 60 / 90 days)
- Weight chart (line graph over selected window)
- Calorie chart (bar or line graph)

**API calls:**

| Call | Purpose | When |
|------|---------|------|
| `GET /stats/tdee?days=28` | Headline TDEE stats for the selected window. | On mount and when user changes the time window. |
| `GET /entries/range?start=<windowStart>&end=<today>` | Raw data for charts. The frontend computes the chart data points from the entry array. | On mount and when user changes the time window. |

**Why two calls:** `/stats/tdee` returns the computed summary (TDEE number, trend direction). `/entries/range` returns the raw daily data needed to render charts. Keeping them separate means the TDEE algorithm lives server-side (single source of truth) while the frontend has the granular data for visualization.

---

### Shared Frontend Concerns

**Token management:**
- Store the JWT in a Solid.js context provider at the app root.
- Create a thin `api` utility that wraps `fetch`, attaches the `Authorization` header, and handles 401 responses (redirect to login).
- On 401, clear the stored token and redirect to `/login`.

**Routing:**
- `@solidjs/router` is already installed. Define routes:
  - `/login` — Login/register (or dev token entry)
  - `/` — Dashboard
  - `/history` — Entry history
  - `/stats` — TDEE trends

**Validation:**
- Reuse the Zod schemas from `shared/schemas/mod.ts` in the frontend for client-side validation before API calls. The schemas are already shared between frontend and backend.

**Error states:**
- Network failures: show a toast/banner, retry on next action.
- 422 from `/stats/tdee`: show "Log at least 3 days of data to see your TDEE" onboarding prompt.
- 400 validation errors: display field-level errors from the Zod details in the response.

---

## Suggested Next Steps (Priority Order)

1. **Frontend scaffold** — Set up routing, auth context (using dev tokens for now), and the API fetch wrapper. This unblocks all screen work.

2. **Dashboard screen** — Today's entry form + TDEE summary card. This is the core daily interaction and exercises the `POST /entries/`, `GET /stats/tdee`, and `GET /entries/range` endpoints.

3. **Entry history screen** — Paginated list with edit/delete. Exercises `GET /entries/`, `PUT /entries/:id`, `DELETE /entries/:id`.

4. **Stats/trends screen** — TDEE over time with charts. Exercises `GET /stats/tdee?days=N` and `GET /entries/range`.

5. **Authentication** — `POST /auth/register`, `/login`, `/logout`. Password hashing (bcrypt/argon2). Session token refresh. Replace the dev token flow.

6. **Database migrations** — Generate and commit Drizzle migrations so the schema is reproducible.

7. **CI/CD** — GitHub Actions: run `deno test` on PR, lint, type-check. Deploy to Deno Deploy.
