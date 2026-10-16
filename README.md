# 🏆 APEX LMS — Sports Academy Learning Management System

A production-grade, full-stack Learning Management System (LMS) purpose-built for sports academies. Students master athletic curricula (Boxing, Football, Tennis, etc.) through structured video modules, sequential unlocking, and instant verified assessments with server-side scoring. Admins manage sports, modules, videos, tests, question banks (with bulk CSV import), student enrollments, and live analytics.

---

## 🌟 Highlights & Key Features

- **Per-Sport Curriculum Tracking**: Accurately computes and tracks per-user, per-sport progression (e.g. *"Boxing: 3 of 13 modules completed (23%)"*) persisting across sessions and devices.
- **Configurable Module Completion Rules**: A module is complete when the video is watched ≥90% **AND** the module assessment is passed (or configurable per module: video-only or test-only).
- **Sequential Progression Unlocking**: Enforces prerequisite module mastery before unlocking subsequent modules (admin-configurable per sport, e.g. Boxing with 13 sequential modules).
- **VideoProvider Abstraction**: Unified interface supporting S3/MinIO presigned signed URLs for private playback & direct upload, as well as YouTube/Vimeo embeds. Auto-resumes playback from last watched position and debounces watch telemetry to the backend.
- **High-Security Test Engine**:
  - **Zero Answer Leakage**: Questions delivered to students are strictly sanitized. Answer keys, accepted short answers, and explanations are **never** sent to the client before submission.
  - **Server-Side Scoring**: Computes score, percentage, and pass/fail in a single database transaction.
  - **Three Question Types**:
    1. MCQ Single-Correct
    2. MCQ Multi-Correct (all-or-nothing or partial points)
    3. Short Answer (case-insensitive, whitespace trim, and optional Levenshtein fuzzy match threshold)
  - **Enforced Time Limits & Grace Period**: Submissions beyond time limits (+ configurable grace period) are rejected on the server.
  - **Autosave & Keyboard Shortcuts**: Background autosave, question flags, and keyboard shortcuts (`←`/`→` to navigate, `1`-`4` to select, `F` to flag).
  - **Instant Results & Review**: Score breakdown, pass/fail badge, confetti celebration on passing, and optional answer reveal policy.
- **Comprehensive Admin Portal**:
  - Sports & Module drag-and-drop reordering.
  - Video upload & external provider configuration.
  - Question creator & Bulk CSV/JSON import with downloadable template.
  - Student manager: enroll/unenroll, toggle account status, and full attempt history audit.
  - Live analytics dashboard: completion rates per sport/module, hardest questions (lowest correct rate), and CSV export.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14+ (App Router), React 19, TypeScript (strict mode), Tailwind CSS, Framer Motion, TanStack Query, React Hook Form + Zod, Recharts, canvas-confetti, cmdk, Sonner |
| **Backend** | Next.js Route Handlers, TypeScript, Zod request validation on every endpoint, Rate Limiting |
| **Database & ORM** | PostgreSQL 16, Prisma ORM with relational schema, indexes, cascade rules, and migrations |
| **Authentication & RBAC** | Auth.js v5 (NextAuth), JWT sessions, bcrypt hashing (cost factor 12), Role-Based Access Control (`STUDENT`, `ADMIN`) via Middleware |
| **Video Engine** | `VideoProvider` abstraction (`S3VideoProvider`, `LocalVideoProvider`), presigned signed URLs (AWS SDK v3), YouTube/Vimeo embed integration |
| **Testing** | Vitest (unit & integration tests for scoring engine & progress calculations), Playwright (E2E) |
| **Infrastructure** | Docker Compose for PostgreSQL 16 and MinIO S3-compatible object storage |

---

## 📋 Assumptions & Design Decisions

As requested, any ambiguous requirements were resolved with sensible defaults documented below:

1. **Video Watch Threshold (≥90%)**:
   - A video is marked as watched once the playback position reaches 90% of the total duration (`watchPercent >= 0.9`). Once achieved, `videoCompleted` is set to `true` and is permanent (watching back to earlier parts does not revoke completion).
2. **Watch Position Persistence**:
   - The video player debounces telemetry every 10 seconds while playing, on pause, and on video end. When reopening a module, the player resumes from the stored timestamp.
3. **Short Answer Fuzzy Matching**:
   - Short answers support case-insensitivity, whitespace trimming, and optional Levenshtein edit distance with configurable threshold (default threshold: 1 or 2 edits). This accommodates minor typographical errors while rejecting wrong answers.
4. **Time Limit Enforcement & Grace Period**:
   - The server enforces test time limits with a default 30-second grace period (`TEST_SUBMISSION_GRACE_PERIOD_SEC=30`) to accommodate network latency. Submissions received after `startedAt + timeLimitSec + graceSec` are rejected with HTTP 400 (`EXPIRED`).
5. **Answer Reveal Policy**:
   - If an admin configures `revealAnswers = false` on a test, the server-side score response excludes correct option IDs, accepted short answers, and explanations. Only marks awarded and pass/fail are returned.
6. **Sequential Unlocking**:
   - Configurable per sport (`sequentialUnlock = true`). Module 1 is always unlocked. Module $N$ ($N > 1$) is unlocked only if all modules from $1$ to $N-1$ are completed (`isCompleted = true`).
7. **Storage Provider Flexibility**:
   - For local development, MinIO provides full S3 API compatibility. The app can switch between `"minio"`, `"s3"`, or embed providers via the `STORAGE_PROVIDER` environment variable.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node 20 & 25)
- PostgreSQL 16 (via Docker or local Homebrew service)
- Docker & Docker Compose (optional for MinIO & Postgres containerization)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd LMS
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default connection string connects to local PostgreSQL:
```env
DATABASE_URL="postgresql://lms:lms_secret@localhost:5432/sports_lms?schema=public"
NEXTAUTH_SECRET="super-secret-key-change-in-production-32chars"
NEXTAUTH_URL="http://localhost:3000"
STORAGE_PROVIDER="minio"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin123"
```

### 3. Start Database (Docker Compose or Native Postgres)

**Option A — Docker Compose:**
```bash
docker compose up -d
```

**Option B — Native macOS Homebrew PostgreSQL:**
```bash
brew services start postgresql@16
psql -d postgres -c "CREATE USER lms WITH PASSWORD 'lms_secret' SUPERUSER;"
psql -d postgres -c "CREATE DATABASE sports_lms OWNER lms;"
```

### 4. Database Setup & Seed
Push the Prisma schema and run the comprehensive seed script:
```bash
npm run db:push
npm run db:seed
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Seeded Demo Credentials

| Role | Email | Password | Pre-seeded Progress |
|---|---|---|---|
| **Super Admin** | `admin@school.test` | `Admin@123!` | Full admin access across all modules & analytics |
| **Student (Alice)** | `alice@school.test` | `Student@123!` | **Boxing: 3 of 13 completed (23%)**, Football: 2 of 6 completed |
| **Student (Bob)** | `bob@school.test` | `Student@123!` | Boxing: 1 of 13 completed, Tennis: 2 of 6 completed |
| **Student (Charlie)** | `charlie@school.test` | `Student@123!` | Football: 4 of 6 completed, Tennis: 1 of 6 completed |

> 💡 **Quick Login**: The login screen features one-click demo account buttons to instantly switch between Student and Admin sessions.

---

## 🧪 Testing Suite

### Unit & Integration Tests (Vitest)
Executes scoring logic tests (MCQ single/multi, short-answer fuzzy match, normalization), progress calculation, and submission flow:
```bash
npx vitest run
```
*Current test suite: 21 tests across 3 suites, 100% passing.*

### Type Checking & Linting
Strict TypeScript checking and ESLint rules:
```bash
npm run type-check
npm run lint
```

### Production Build Validation
```bash
npm run build
```

### End-to-End Tests (Playwright)
Validates student login, dashboard progress verification, module sequential locking, and admin portal access:
```bash
npx playwright test
```

---

## 📂 Project Directory Structure

```
LMS/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Sport, Module, Video, Test, Attempt, etc.)
│   └── seed.ts                # Seed script (Admin, 3 students, 3 sports, 25 modules, tests)
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login & Registration pages
│   │   ├── (student)/
│   │   │   ├── dashboard/     # Student Dashboard (cards, streak, progress rings)
│   │   │   ├── sports/[slug]/ # Sport curriculum & sequential module listing
│   │   │   ├── modules/[id]/  # Video player, notes, take test button
│   │   │   ├── tests/[id]/    # Test engine with autosave & timer
│   │   │   └── profile/       # Badges, verified certificates, and attempt history
│   │   ├── admin/
│   │   │   ├── page.tsx       # Live Analytics dashboard & KPIs
│   │   │   ├── sports/        # Sports CRUD & module drag-and-drop reordering
│   │   │   ├── modules/[id]/  # Video source, test settings, question builder, bulk import
│   │   │   └── students/      # Student directory, progress inspector, enrollment manager
│   │   ├── api/               # Secure Route Handlers with Zod validation & RBAC
│   │   │   ├── auth/          # Login, Register, Me
│   │   │   ├── student/       # Sports, modules, video progress, tests start/autosave/submit
│   │   │   └── admin/         # Sports, modules reorder, questions, bulk import, analytics
│   │   ├── layout.tsx         # Root dark layout with Providers & Navbar
│   │   └── globals.css        # Sports dark design system with glassmorphism tokens
│   ├── components/
│   │   ├── player/            # VideoPlayer with auto-resume & watch progress telemetry
│   │   ├── test/              # TestTakingUI (single-question slide) & ResultsScreen (confetti)
│   │   ├── shared/            # Navbar, CommandPalette (Cmd+K), CircularProgress, LinearProgress
│   │   └── providers.tsx      # TanStack Query & NextAuth Session providers
│   ├── lib/
│   │   ├── auth.ts            # Auth.js v5 credentials configuration
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── scoring.ts         # Server-side scoring engine (pure functions)
│   │   ├── progress.ts        # Curriculum progress & sequential unlocking engine
│   │   ├── video/             # VideoProvider interface & S3/MinIO implementation
│   │   └── validations/       # Zod validation schemas for all requests
│   └── middleware.ts          # RBAC & security headers middleware
├── tests/
│   ├── unit/                  # Scoring & progress unit tests
│   ├── integration/           # Submit attempt integration test
│   └── e2e/                   # Playwright E2E browser tests
├── docker-compose.yml         # PostgreSQL 16 & MinIO containers
├── .env.example               # Environment variables template
└── README.md
```

---

## 🔒 Security Architecture

1. **Answer Key Protection**:
   - `Option.isCorrect` and `AcceptedAnswer` records are **never** queried or included in the API response when starting a test (`/api/student/tests/[id]/start`).
2. **Server-Side Scoring Transaction**:
   - Client sends only `{ questionId, selectedOptionIds, textAnswer }`. All evaluation, marks summation, and pass/fail derivation happen strictly inside `db.$transaction`.
3. **Role-Based Access Control**:
   - Next.js middleware and route-level `requireAdmin()` guard prevent unauthorized access to `/admin` and `/api/admin/*`.
4. **Rate Limiting**:
   - Built-in rate limiting prevents brute-force attempts on `/api/auth/register` and automated script abuse on `/api/student/attempts/[id]/submit`.
5. **Short-Lived Signed Video URLs**:
   - Video content hosted in S3/MinIO is delivered via signed URLs with configurable expiration (`SIGNED_URL_EXPIRES_IN=3600`).
