<p align="center">
  <img src="https://img.shields.io/badge/Status-Phase%201-blue" alt="Status" />
  <img src="https://img.shields.io/badge/License-Private-red" alt="License" />
  <img src="https://img.shields.io/badge/Python-3.11+-yellow?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TimescaleDB-PG15-FDB515?logo=timescale&logoColor=white" alt="TimescaleDB" />
</p>

# Pulse

**Churn intelligence for gyms.** Pulse predicts which members are about to cancel, tells you why, and recommends what to do about it.

It analyzes training frequency, payment behavior, and engagement patterns to generate a risk score (0-100) for every member — then suggests retention actions via WhatsApp, email, or in-person contact.

---

## How It Works

```
CSV Import  ──>  Feature Extraction  ──>  Scoring Engine  ──>  Dashboard + Alerts
 (members,        (daily Celery job)      (7 rules, 0-100)     (at-risk list,
  checkins,                                                      retention actions)
  payments)
```

### Scoring Rules

| # | Signal | Condition | Points |
|---|--------|-----------|--------|
| 1 | Days without training | > 14 days | +40 |
| 2 | Frequency drop | > 50% vs previous month | +30 |
| 3 | Overdue payments | Any in last 90 days | +20 |
| 4 | Duration drop | > 30% shorter sessions | +15 |
| 5 | Low frequency | < 4 workouts/month | +10 |
| 6 | Payment history | > 30% paid late | +10 |
| 7 | New student | < 3 months enrolled | +5 |

**Risk tiers:** Critical (>=60) | Medium (>=30) | Low (>=10) | Safe (<10)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI 0.115, Python 3.11+ |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Database** | PostgreSQL 15 + TimescaleDB (hypertable on checkins) |
| **Task Queue** | Celery 5.4 + Redis 7 |
| **Auth** | Clerk (JWT RS256, Organizations = multi-tenant) |
| **UI** | shadcn/ui + Radix primitives |
| **Billing** | Stripe (subscriptions, invoices, coupons) |
| **ML (Phase 2)** | scikit-learn, XGBoost, SHAP |

---

## Architecture

```
pulse/
├── backend/
│   ├── api/              # FastAPI routes, schemas, middleware, auth
│   ├── domain/           # Pure entities and business rules (no deps)
│   ├── use_cases/        # Orchestration: scoring, features, CSV import
│   ├── repositories/     # Data access (interfaces + Postgres impl)
│   ├── infra/            # Config, DB engine, Celery, tenant context
│   ├── tasks/            # Celery jobs (daily scoring, feature extraction)
│   ├── migrations/       # Sequential SQL migrations
│   └── tests/            # Unit + integration tests (pytest)
├── frontend/
│   └── src/              # Next.js app router, components, lib
├── specs/                # Product specifications (6 docs)
├── scripts/              # Seed scripts (Clerk orgs, DB sync)
├── docker-compose.yml    # DB + Redis + API + Worker + Frontend
└── Makefile              # Dev commands
```

### Key Design Decisions

- **Clean Architecture** — `domain/` has zero external imports. Dependencies flow inward: `api/ -> use_cases/ -> repositories/ -> domain/`
- **Multi-tenant from day one** — `gym_id` on every table, Row-Level Security enforced at the Postgres level, tenant context propagated through middleware and Celery jobs
- **Time-series optimized** — Checkins table is a TimescaleDB hypertable with 7-day chunks for efficient range queries
- **Two-phase ML** — Rules-based scoring ships first; ML (XGBoost + SHAP) activates only after gating criteria are met (6+ months of data, 80+ cancellations)

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for seeds and frontend local dev)
- Python 3.11+ (for backend local dev)
- A [Clerk](https://clerk.com) account (for auth)

### 1. Clone and configure

```bash
git clone https://github.com/makusdouglas/gym-pulse.git
cd gym-pulse
cp .env.example .env
```

Edit `.env` with your Clerk keys, Stripe keys, and any other secrets.

### 2. Full setup (Docker)

```bash
make setup
```

This starts the database and Redis, runs migrations, seeds Clerk organizations, and syncs them to the local DB.

### 3. Run everything

```bash
# Option A: All in Docker
make up

# Option B: Infra in Docker, apps locally (faster reload)
make dev-infra    # DB + Redis
make dev-api      # FastAPI on :8000
make dev-worker   # Celery + Beat
make dev-front    # Next.js on :3000
```

### 4. Open the app

- **Frontend:** http://localhost:3000
- **API docs:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/dashboard/stats` | JWT | KPIs: active members, at-risk count, tier breakdown |
| GET | `/members` | JWT | List members (paginated, search, status filter) |
| GET | `/members/{id}/score` | JWT | Score member on-demand with signal breakdown |
| GET | `/at-risk` | JWT | At-risk members (tier filter, paginated) |
| POST | `/import/csv` | JWT | Import members, checkins, or payments CSV |
| GET | `/actions` | JWT | List retention actions |
| POST | `/actions` | JWT | Create retention action |
| GET | `/notifications` | JWT | List notifications (with unread count) |
| PUT | `/notifications/read-all` | JWT | Mark all notifications read |
| PUT | `/notifications/{id}/read` | JWT | Mark single notification read |
| GET | `/payments` | JWT | List payments (status/member filter) |
| GET | `/gym/settings` | JWT | Get gym settings |
| PUT | `/gym/settings` | JWT | Update gym settings |

---

## Testing

```bash
make test               # Unit tests (271 tests, ~1s)
make test-integration   # Integration tests against real DB (54 tests, ~7s)
make test-all           # Everything
```

Integration tests use a dedicated `churndb_test` database, real SQL queries, and verify tenant isolation via RLS.

---

## Makefile Reference

```bash
make up              # Start all services (Docker)
make down            # Stop everything
make dev-infra       # Start DB + Redis only
make dev-api         # FastAPI with hot reload
make dev-worker      # Celery worker + Beat
make dev-front       # Next.js dev server
make setup           # Full setup: infra + migrations + seeds
make test            # Unit tests
make test-integration # Integration tests
make test-all        # All tests
make lint            # Ruff linter
make lint-fix        # Auto-fix lint issues
make seed-clerk      # Seed Clerk organizations
make seed-db         # Sync Clerk orgs to local DB
make test-db-reset   # Reset test database
make logs s=api      # Tail logs for a service
make rebuild         # Rebuild containers
```

---

## Project Phases

### Phase 1 — Rule-based scoring (current)
- [x] Docker environment (TimescaleDB + Redis)
- [x] CSV import (members, checkins, payments)
- [x] 7-rule scoring engine
- [x] FastAPI with full CRUD endpoints
- [x] Daily Celery jobs (feature extraction + scoring)
- [x] Multi-tenant with RLS
- [x] Clerk auth integration
- [x] Frontend (Next.js + shadcn/ui)
- [x] Integration test suite

### Phase 2 — Machine Learning (planned)
Gate: 6+ months history, 80+ cancellations, 2+ months of actions log, 2+ gyms

- [ ] Temporal train/test split (never random)
- [ ] SMOTE for class imbalance (train set only)
- [ ] LogisticRegression (<1000 samples) / XGBoost (>=1000)
- [ ] SHAP explainability
- [ ] Shadow mode before activation
- [ ] Monthly auto-retraining (only if PR-AUC improves >0.01)
- [ ] Rules always remain as fallback

---

## License

Private. All rights reserved.
