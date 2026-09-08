# IronPilot - your AI gym co-pilot

A full-stack gym tracking system, personal fitness coach, workout planner, progress analyzer and AI diet planner for gym members who don't have a personal trainer.

Walk into the gym, press **Start Session**, follow the guided plan with rest/cardio timers, log every set, and get an AI summary, diet plan and daily/weekly/monthly coaching powered by Google Gemini.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS ("Bento Sport" design system: graphite + volt-lime, mobile-first), React Router 7, TanStack Query 5, Recharts, Framer Motion, PWA |
| Backend | Node.js 20+, Express 4, REST, JWT auth + Google Sign-In, Zod validation, Helmet, rate limiting, Nodemailer |
| Database | MongoDB + Mongoose 8 (auto-seeds the library on first start) |
| AI | Google Gemini REST API - key stays server-side, models discovered dynamically, rule-based fallback |
| Deploy | Frontend → Vercel · Backend → Render / Azure / AWS · DB → MongoDB Atlas |

## Quick start

```bash
npm run install:all
cp server/.env.example server/.env      # set MONGO_URI, JWT_SECRET (+ GEMINI_API_KEY, SMTP_*, GOOGLE_CLIENT_ID as needed)
npm run dev                             # API on http://localhost:5000, client on http://localhost:5173
```

No MongoDB installed? Use the bundled local database instead (data persists in `server/.data/mongo`):

```bash
npm run dev:memory
```

The library (20 equipment, 46 exercises, 80+ foods, 6 workout templates, 5 diet templates, 12 achievements) and the admin user are **seeded automatically** the first time the server starts against an empty database (`AUTO_SEED=true`). Default admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (`admin@ironpilot.app` / `Admin@12345` by default) - change these before deploying.

### Quality checks

```bash
npm run lint        # ESLint for server (node) and client (typescript + react-hooks)
npm run typecheck   # tsc for the client
npm run smoke       # end-to-end API test on an in-memory MongoDB
```

### API smoke test (no MongoDB needed)

```bash
npm run smoke
```

Boots an in-memory MongoDB and walks the full journey: register → login → forgot/reset (email) → Google-route guard → onboarding → plan generation → schedule → session with sets, cardio, rest → finish → AI summary → share link → tracking → diet → recommendations → chat → analytics → achievements → admin CRUD.

## Environment variables

**server/.env**

| Var | Description |
| --- | --- |
| `PORT` | API port (default 5000). The client dev proxy forwards `/api` here |
| `CLIENT_URL` | Allowed CORS origin(s), comma separated; also used in email links |
| `MONGO_URI` | MongoDB / Atlas connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REMEMBER_EXPIRES_IN` | Auth tokens (7d / 30d with "Remember me") |
| `GOOGLE_CLIENT_ID` | OAuth Web client ID for "Continue with Google" (same value in client `VITE_GOOGLE_CLIENT_ID`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email for forgot-password / welcome mails. Empty → emails are logged to the console and the reset link is returned in dev |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini key + preferred model (default `gemini-2.5-flash`). Empty key → rule-based coach |
| `AUTO_SEED` | Seed library on empty DB (default true) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_NAME` | Seeded admin + brand name used in emails/prompts |

**client/.env**

| Var | Description |
| --- | --- |
| `VITE_API_URL` | Backend origin in production (e.g. `https://ironpilot-api.onrender.com`). Empty in dev = Vite proxy |
| `VITE_PROXY_TARGET` | Dev only: where `/api` is proxied (default `http://localhost:5000`) |
| `VITE_GOOGLE_CLIENT_ID` | Shows the Google button when set |

### Google Sign-In setup
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
2. Authorised JavaScript origins: `http://localhost:5173` and your Vercel URL.
3. Put the client ID in `server/.env` (`GOOGLE_CLIENT_ID`) and `client/.env` (`VITE_GOOGLE_CLIENT_ID`).
New Google users land on `/onboarding` to enter gender, age, height, weight, goal, experience, days/week and diet; then targets are computed.

### Email setup (Gmail example)
`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<16-char app password>` (Google account → Security → App passwords).

### Why is the AI falling back to rules?
Open **AI Coach** - a banner shows the exact Gemini error (`GET /api/ai/status`). Common causes: quota exceeded on the free tier (429), a retired model name (the server now lists your available models and tries them in order), or a missing key. Cached rule-based recommendations are regenerated automatically once Gemini starts working.

## Features

- **Auth**: sign up (full profile), login with show/hide password + remember me, Google Sign-In with onboarding, forgot/reset password by email, change password, JWT, roles.
- **Dashboard**: quick actions on top (thumb-reachable strip on phones), today's plan or a **coach pick** (the plan whose muscle groups have gone longest untrained, switching to something light after a long streak / hard day or when the weekly target is met), calories, duration, water, weight, goal progress, BMI, streak, level/points, quick actions, AI coach widget.
- **Gym check-in journey**: Start Session (manual or QR, coach pick pre-selected) → guided exercise cards → set logging with auto rest timer (30/60/90/120 s + custom, beep/vibrate/flash) → cardio timer with distance/speed/calories → undo last set / remove exercise / skip / next / add → pause/resume → finish (with or without an AI summary) or delete → achievements → share link.
- **Beginner guided mode**: animated form guide for every exercise (stick-figure movement pattern with the working muscles highlighted, phase labels, slow-motion, synced step cues) plus equipment image, purpose, how-to, recommended weight/duration/speed and safety tips inline.
- **Libraries**: equipment (cardio, machines, free weights) and exercises with filters and favourites.
- **Planner**: drag-to-reorder builder, templates, duplicate, AI generation with **coach-style starting loads** (repeat/progress your last logged weight, or a conservative body-weight-based estimate by level and sex, with a note per exercise); **This week's plan** - a 7-day programme (sessions with sets, reps and kg, rest days, warm-ups) plus training-day / rest-day calories, protein split across meals and coach notes, generated once per week and applicable to the schedule in one tap; weekly schedule as a swipeable 7-day strip with a plan picker, training-days-vs-target summary, muscle coverage and reminders.
- **Tracking**: history search with session edit/delete, manual / voice (Web Speech) / offline logging with sync, weight trend + BMI + measurements, water with undo, meals vs macro targets (taken / remaining per macro) with a searchable **food library** (80+ foods incl. Indian staples, household servings → macros auto-filled).
- **AI**: diet planner, daily/weekly/monthly recommendations, session summaries, **"what to eat next"** suggestions that fill the remaining macros for the day (respecting diet preference and the active diet plan, one-tap log), today's plan pick, chat coach with live user data and Markdown-rendered replies (a fresh conversation on every login, previous chats kept in History and archived on the device); deterministic fallback when Gemini is unavailable.
- **Analytics**: daily/weekly/monthly/equipment with charts and PDF export.
- **Gamification**: 12 achievements, points and levels. **Notifications**: workout/water/weight/meal reminders + admin broadcasts.
- **Admin**: analytics, users, equipment/exercise CRUD, diet templates, notifications.
- **UX**: Bento Sport design (light/dark/system), mobile-first with a thumb-reachable bottom bar and raised Start button, collapsible icon-only sidebar on desktop, bottom-sheet modals, 44px touch targets, safe-area insets for notched / curved phones, animations, accessible controls, installable PWA with offline shell.

## Security

- **Auth**: bcrypt (cost 12); JWT `iat` is checked against `passwordChangedAt`, so a password change or reset invalidates older tokens; login is timing-equalised and returns generic errors; passwords need 8+ characters; Google ID tokens are verified server-side against `GOOGLE_CLIENT_ID`.
- **Abuse protection**: 300 req/min globally, 10 attempts / 15 min on login, Google, forgot/reset and change-password (successful requests are not counted), 20 AI calls/min.
- **Input**: Zod validation on every body (unknown keys stripped), a sanitizer that removes `$`/dotted keys from body, query and params (operator injection), regex-escaped and length-capped search terms (ReDoS), image fields limited to http(s) or base64 image data URLs, notification links limited to relative app paths, 6 MB JSON limit.
- **Transport/headers**: Helmet on the API, CORS restricted to `CLIENT_URL`, Vercel headers with CSP, HSTS, nosniff and `frame-ancestors 'none'`; the SPA sanitises redirect targets and the theme bootstrap is an external script (no inline JS).
- **Production guard**: the server refuses to start with a missing/short/default `JWT_SECRET`, or missing `MONGO_URI` / `CLIENT_URL`; it hides stack traces and internal 500 messages and warns if the seeded admin password is still the default.
- **AI guardrails**: the coach is scoped to fitness/nutrition only (off-topic questions are declined with a redirect), never reveals the underlying model or its instructions, and treats all user data as data (wrapped in <user_data> tags, never as commands). Model calls are minimised: daily/weekly/monthly insights cached per day, meal suggestions cached 30 min, identical chat questions reused for 15 min, chat history capped at 8 messages x 600 chars, tight output caps, and a per-user daily budget (`AI_DAILY_CALLS_PER_USER`, default 80) after which rule-based answers are used. Model names, errors and token counts are visible to admins only (`GET /api/ai/status`); the UI never shows the provider.
- **Dependencies**: `npm audit` is clean for both packages (express `qs` and `dompurify` pinned via overrides, react-router 7).
- **No duplicate records**: identical POSTs within 4 s (double taps, retries) are replayed from the first response instead of creating a second row; one weigh-in per day (same-day entries update); weekly plans are upserted per user and week and applying them matches existing plans by name; repeated chat questions reuse the stored answer; seeds and notifications are upserted/deduped.
- Secrets live only in `server/.env` (git-ignored). Rotate any credential that has ever been pasted into a chat, log or screenshot.

## Reliability & performance

- **API unreachable**: the Vite proxy answers a clean 503 (no stack traces), the client keeps your session, shows a "Can't reach the server" screen/banner and probes every 10 s until the API is back - it never logs you out for a network blip.
- **Errors**: a friendly 404 page for unknown routes, a page-level error boundary (the shell stays usable), a root boundary, and every API error carries a `code` and `requestId` (also sent as the `X-Request-Id` header). Invalid JSON, oversized bodies, database outages and upstream timeouts map to 400/413/503/504 instead of 500.
- **Server lifecycle**: graceful shutdown on SIGINT/SIGTERM (in-flight requests finish, DB closes), unhandled-rejection logging, keep-alive/header/request timeouts.
- **Database**: connection pool (`DB_POOL_SIZE`, default 10) with exponential-backoff reconnect on boot and reconnect logging; compound indexes on every hot query (user+status, user+date, user+exercise, plan schedule/public lookups); dashboard queries run in parallel; the library (equipment, exercises, foods) is served with `Cache-Control: private, max-age=300` + ETags.

## Project layout

```
server/src/{models,controllers,routes,services,seed,utils}   Express API
server/scripts/smoke.js                                      end-to-end API test
server/scripts/dev-memory.js                                 local file-backed MongoDB runner
client/src/{pages,components,context,hooks,lib,types}        React PWA
```

## Deployment

**Backend (Render)** - `render.yaml` included: root `server/`, build `npm install`, start `npm start`, set the env vars above (`CLIENT_URL` = your Vercel URL). The DB seeds itself on first boot.

**Frontend (Vercel)** - root `client/`, framework Vite, env `VITE_API_URL` (+ `VITE_GOOGLE_CLIENT_ID`). `client/vercel.json` rewrites routes to `index.html`.

**Database** - MongoDB Atlas; allow the backend's IP and paste the SRV URI into `MONGO_URI`.

## Roadmap
Wearables (Fitbit / Apple Health / Google Fit / smartwatch), camera-based form analysis, AI injury prevention, voice AI trainer. Steps are currently estimated from logged cardio distance.
