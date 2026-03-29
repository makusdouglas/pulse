# Pulse — System Overview

## 1. Produto

**Pulse** e um SaaS B2B que prediz churn de alunos em academias. Analisa frequencia de treinos, pagamentos e comportamento para gerar um score de risco (0-100) e recomendar acoes de retencao.

## 2. Stack

| Componente | Tecnologia | Versao |
|---|---|---|
| Banco de dados | PostgreSQL + TimescaleDB | PG 15 |
| Backend | FastAPI (Python) | 0.115.6 |
| Task queue | Celery + Redis | 5.4.0 / 7 |
| Frontend | Next.js (TypeScript) | 15.2.0 |
| Auth | Clerk (Organizations = multi-tenant) | 6.12.0 |
| UI | shadcn/ui + Radix + Tailwind | 3.4.0 |
| ML v1 | scikit-learn (LogisticRegression) | 1.6.0 |
| ML v2 | XGBoost | 2.1.3 |
| Explicabilidade | SHAP | 0.46.0 |
| Billing | Stripe | 11.4.1 |
| Deploy | Railway ou Render | — |

## 3. Arquitetura

```
                    ┌─────────────┐
                    │   Clerk     │
                    │  (Auth)     │
                    └──────┬──────┘
                           │ JWT (org_id = gym_id)
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  Frontend  │   │  Backend  │   │  Worker   │
    │  Next.js   │──▶│  FastAPI  │   │  Celery   │
    │  :3000     │   │  :8000    │   │  Beat     │
    └────────────┘   └─────┬─────┘   └─────┬─────┘
                           │               │
                    ┌──────┴───────┐        │
                    │              │        │
              ┌─────▼─────┐ ┌─────▼─────┐  │
              │ PostgreSQL │ │   Redis   │◀─┘
              │ TimescaleDB│ │  (broker) │
              └────────────┘ └───────────┘
```

### Monorepo

```
pulse/
├── backend/          # FastAPI + Celery (Python)
├── frontend/         # Next.js (TypeScript)
├── specs/            # Especificacoes do projeto
├── docker-compose.yml
├── Makefile
├── CLAUDE.md
└── design.pen        # Design UI (Pencil MCP)
```

### Docker Compose — 5 servicos

| Servico | Imagem | Porta | Healthcheck |
|---------|--------|-------|-------------|
| db | timescale/timescaledb:latest-pg15 | 5432 | pg_isready |
| redis | redis:7-alpine | 6379 | redis-cli ping |
| api | backend/Dockerfile | 8000 | — |
| worker | backend/Dockerfile (cmd diferente) | — | — |
| frontend | frontend/Dockerfile | 3000 | — |

> API e Worker compartilham o mesmo Dockerfile. Apenas o command muda.

## 4. Multi-Tenancy

| Camada | Mecanismo |
|--------|-----------|
| Frontend | Clerk Organizations (1 org = 1 academia) |
| JWT | org_id embutido no token |
| Middleware | TenantMiddleware extrai org_id, seta contextvars |
| DB Session | `SET LOCAL app.current_gym_id = :gym_id` |
| Postgres | RLS: `USING (gym_id = current_setting('app.current_gym_id')::UUID)` |
| Celery | `set_tenant()` antes de executar jobs |

**Defesa em profundidade**: codigo filtra por gym_id AND Postgres aplica RLS.

## 5. Clean Architecture

```
domain/           → nao importa nada externo (puro Python)
use_cases/        → importa domain/ e repositories/interfaces/
repositories/     → interfaces/ (ABCs) + postgres/ (implementacoes)
api/              → importa use_cases/ e api/schemas/
infra/            → nao importa dominio
tasks/            → importa use_cases/
```

## 6. Fases do Projeto

### Fase 1 — Sistema de Regras (semanas 1-8)
Scoring baseado em 7 regras deterministicas. Sem ML.

### Fase 2 — ML (semanas 9-16)
**Gate obrigatorio** (todos precisam ser verdadeiros):
- 6+ meses de dados historicos
- 80+ cancelamentos registrados
- 2+ meses de actions_log
- 2+ academias ativas

## 7. Metricas de Sucesso

| Fase | Metrica | Target |
|------|---------|--------|
| 1 | Acerto retroativo de cancelamentos | > 65% |
| 1 | Academias pagantes | >= 1 (R$297/mes) |
| 2 | PR-AUC | > 0.78 |
| 2 | Recall | > 0.70 |
| 2 | ML vs Regras | +10 pontos PR-AUC |

## 8. Agentes Claude Code

14 agentes especializados orquestrados pelo `/workflow`:

| Agente | Responsabilidade |
|--------|-----------------|
| `/api` | Endpoints FastAPI, schemas, auth |
| `/arch` | Qualidade de codigo, padroes, anti-patterns |
| `/db` | Schema, migrations, indexes, RLS |
| `/devops` | Docker, deploy, infra |
| `/frontend` | Next.js, componentes, responsividade |
| `/git` | Branches, commits, PRs |
| `/import` | Parser CSV, loader, formatos BR |
| `/ml` | Pipeline ML (Fase 2) |
| `/score` | Engine de scoring (7 regras) |
| `/security` | Auditoria OWASP, LGPD, rate limiting |
| `/tasks` | Celery jobs, schedules |
| `/test` | Pytest, fixtures, cobertura |
| `/ux` | Design system, acessibilidade, Pencil |
| `/workflow` | Orquestrador de pipeline |

### Pipeline do Workflow

```
Branch → Identificar task → Classificar → Executar agentes → Commit → Code Review → Update TODO → PR
```

Regras:
- `/test` e `/arch` sao **obrigatorios** em todo pipeline
- `/code-reviewer` sempre roda antes do PR
- Agentes rodam end-to-end sem pausas
- PR sempre criado apos commit em branch nova
