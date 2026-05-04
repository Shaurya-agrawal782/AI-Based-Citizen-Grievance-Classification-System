# CivicTrust AI

CivicTrust AI is a full-stack citizen grievance platform for filing, classifying, routing, tracking, and resolving civic complaints. It combines a React/Vite citizen and officer portal with an Express/MongoDB API, JWT authentication, Google Gemini-powered grievance analysis, duplicate detection, audit history, taxonomy management, QR-zone reporting, and demo/benchmark tooling.

The app is currently branded in the UI as the Civic Architect Portal and focuses on municipal complaint workflows such as public infrastructure, sanitation, water supply, electricity, and public safety.

## Key Features

- Citizen grievance filing with guided steps, voice-first complaint input, location detection, privacy consent, and AI-assisted drafting.
- AI classification using Gemini 1.5 Flash when `GEMINI_API_KEY` is configured, with a keyword-based fallback when it is not.
- Real-time department suggestions, confidence, priority, sentiment, language detection, image evidence verification, and duplicate warnings.
- Citizen dashboards, public tracking by grievance ID, demo ticket tracking, receipts, and citizen-visible case history.
- Admin and department dashboards with queue filtering, analytics, status updates, assignment, escalation, reopening, feedback handling, and a Leaflet map command center.
- Taxonomy Studio for admin-managed categories, synonyms, priority rules, SLA rules, and escalation rules.
- CivicDraft AI tools for converting rough citizen text into formal complaints and suggesting officer actions.
- QR Zone Reporting for location-aware public QR posters and zone-specific report links.
- Audit trail and case history utilities for accountability, with citizen/internal visibility separation.
- Privacy utilities for masking phone numbers, emails, ID-like numbers, PIN codes, and house numbers.
- AI benchmark scripts and saved benchmark result APIs for evaluating classification behavior.

## Tech Stack

### Client

- React 19
- Vite 7
- React Router 7
- Axios
- Framer Motion
- Lucide React and Material Symbols
- Recharts
- Leaflet / React Leaflet
- qrcode.react

### Server

- Node.js
- Express 4
- MongoDB with Mongoose 8
- JWT authentication
- bcryptjs password hashing
- Google Generative AI SDK
- dotenv, cors, multer

## Project Structure

```text
.
|-- client/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |   |-- admin/
|   |   |   |-- citizen/
|   |   |   |-- common/
|   |   |   `-- demo/
|   |   |-- context/
|   |   |-- data/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- styles/
|   |   `-- utils/
|   |-- package.json
|   `-- vite.config.js
|-- server/
|   |-- data/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- scripts/
|   |-- services/
|   |   |-- ai/
|   |   `-- privacy/
|   |-- utils/
|   |-- index.js
|   |-- seed.js
|   `-- package.json
`-- README.md
```

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` for the Vite 7 client dependency.
- MongoDB local instance or MongoDB Atlas cluster.
- Google Gemini API key for live Gemini classification. The backend still works without it by using fallback keyword logic.

## Environment Variables

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/civictrust
JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
EXPOSE_RESET_TOKEN=true
```

Notes:

- `CLIENT_URL`, `FRONTEND_URL`, or `APP_URL` can be used for password reset links. `CLIENT_URL` is the clearest option.
- `EXPOSE_RESET_TOKEN=true` is useful for local/demo mode because no SMTP mailer is implemented. Set it to `false` in production-style environments.
- `GEMINI_API_KEY` is optional for local demos, but AI output will be less capable without it.

Create `client/.env` only if you want to override the default API base:

```env
VITE_API_BASE=http://localhost:5000/api
```

The client already defaults to `http://localhost:5000/api`, and Vite also proxies `/api` to `http://localhost:5000`.

## Installation

Install dependencies in both apps:

```bash
cd server
npm install

cd ../client
npm install
```

## Running Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:5000/api/health
```

## Optional Seed Data

Seed taxonomy categories:

```bash
cd server
npm run seed:taxonomy
```

Seed demo users and grievances:

```bash
cd server
node seed.js
```

Important: `server/seed.js` clears existing `User` and `Grievance` data before inserting demo data.

Seeded login examples:

```text
Admin:   admin@civictrust.gov / admin123
Citizen: jane@example.com / citizen123
Citizen: rahul@example.com / citizen123
Departments:
  publicworks@civictrust.gov / dept123
  sanitation@civictrust.gov / dept123
  water@civictrust.gov / dept123
```

## Available Scripts

### Server

```bash
npm start              # run index.js
npm run dev            # run API with node --watch
npm run test:ai        # run AI intelligence test script
npm run benchmark:ai   # generate benchmark results JSON
npm run test:privacy   # test PII masking
npm run test:audit     # test audit logger helpers
npm run seed:taxonomy  # seed taxonomy categories
```

### Client

```bash
npm run dev       # start Vite dev server
npm run build     # create production build
npm run preview   # preview production build
```

## Main App Routes

Public routes:

```text
/                  Landing page
/auth              Login, registration, password reset
/demo-mode         Interactive AI demo scenario
/qr-zones          QR poster gallery
/qr-report/:zoneId Zone-specific reporting flow
/copilot           CivicDraft AI and officer action assistant
/track-ticket      Demo ticket tracker
```

Citizen routes:

```text
/dashboard
/grievance/new
/new-grievance
/track
```

Admin and department routes:

```text
/admin
/admin/grievance/:id
/admin/analytics
/admin/map
```

Admin-only route:

```text
/admin/taxonomy
```

## API Overview

Base URL:

```text
http://localhost:5000/api
```

Authentication:

```text
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password/:token
GET  /auth/me
```

Grievances:

```text
GET   /grievances/stats
POST  /grievances
GET   /grievances
GET   /grievances/:id
GET   /grievances/track/:trackingId
PATCH /grievances/:id/status
PATCH /grievances/:id/assign
POST  /grievances/:id/feedback
PATCH /grievances/:id/escalate
PATCH /grievances/:id/reopen
```

AI:

```text
POST /ai/classify
POST /ai/check-duplicate
POST /ai/generate-response
GET  /ai/benchmark/results
```

Taxonomy:

```text
GET    /taxonomy
GET    /taxonomy/:id
POST   /taxonomy
PUT    /taxonomy/:id
PATCH  /taxonomy/:id/toggle
DELETE /taxonomy/:id
```

Demo:

```text
GET /demo/scenario
GET /demo/ai-analysis
GET /demo/benchmark-summary
```

## Roles and Access

- `citizen`: file grievances, view own dashboard, track own complaints, submit feedback.
- `department`: view and update assigned department queues, use admin analytics/detail workflows.
- `admin`: full grievance operations, assignment, escalation, taxonomy management, benchmark results.

## AI and Benchmarking

The primary live AI integration is in `server/utils/geminiAI.js`. If `GEMINI_API_KEY` is present, the server calls Gemini 1.5 Flash for classification and official response drafts. If the key is missing or the call fails, it falls back to local keyword classification in `server/utils/aiClassifier.js`.

For deterministic AI pipeline experiments, use:

```bash
cd server
npm run benchmark:ai
```

This writes results to:

```text
server/data/benchmarkResults.json
```

The API exposes those results at `GET /api/ai/benchmark/results` for admin users.

## Data Models

- `User`: citizen, admin, and department users with JWT login support and password reset fields.
- `Grievance`: complaint details, tracking ID, category, department, priority, status, location, AI classification, feedback, audit trail, case history, and timeline.
- `TaxonomyCategory`: configurable category metadata, department routing, synonyms, examples, priority rules, SLA rules, escalation rules, and active/inactive state.

## Notes for Development

- The client stores auth data in `localStorage` as `civictrust_token` and `civictrust_user`.
- The Axios client attaches the bearer token automatically and redirects to `/auth` on `401`.
- Public tracking by grievance ID intentionally exposes only public/citizen-visible history.
- Admin and department users can see the full grievance detail, including audit trail data.
- `client/src/pages/AIBenchmarkDashboard.jsx` exists, but it is not currently wired into `client/src/App.jsx`.
- There is no dedicated mailer service yet; password reset uses demo token exposure unless production environment settings disable it.

## License

No license file is currently included in this repository.
