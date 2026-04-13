# Pulse — Churn Intelligence SaaS para Academias

## Visao geral

O app se chama **Pulse**. SaaS B2B que prediz churn de alunos em academias. Duas fases: regras primeiro, ML depois. O produto analisa frequencia de treinos, pagamentos e comportamento para gerar um score de risco (0-100) e recomendar acoes de retencao.

## Stack

| Componente | Tecnologia |
|---|---|
| Banco de dados | Postgres + TimescaleDB |
| Backend | NestJS (TypeScript) |
| WhatsApp | Evolution API (self-hosted) |
| Frontend | Next.js (TypeScript) |
| Auth | Clerk (Organizations = multi-tenant) |
| ML v1 | scikit-learn (LogisticRegression) |
| ML v2 | XGBoost |
| Explicabilidade | SHAP |
| Deploy | Railway ou Render |

## Arquitetura

- **Monorepo**: `backend_v2/` (NestJS) + `frontend/` (Next.js) + `docker-compose.yml` na raiz
- **Backend**: Clean Architecture (domain → data → infra → presentation)
- **Multi-tenant**: Shared DB + RLS. `gym_id` em TODAS as tabelas. Clerk org_id = gym_id
- **Banco**: TimescaleDB com hypertable em `checkins` (serie temporal)
- **Core tables**: `gyms`, `members`, `checkins`, `payments`, `member_features`, `churn_scores`, `actions_log`
- **Billing tables**: `plans`, `subscriptions`, `invoices`, `coupons`, `coupon_usage`, `promotions`
- **Admin tables**: `admin_users`, `admin_sessions`
- **Scoring**: Rule-based scoring with tiers: critical (>=60), medium (>=30), low (>=10), safe (<10)
- **Jobs**: NestJS @Schedule — scoring diario as 3h e retreino mensal no dia 1
- **API**: NestJS com Swagger em `/api-docs`
- **Auth**: Clerk — JWT no backend, componentes prontos no frontend. Clerk Organizations = 1 org = 1 academia (org_id = gym_id)

### Estrutura de pastas
```
pulse/
├── backend_v2/
│   ├── src/
│   │   ├── domain/           # Entidades e regras de negocio puras
│   │   │   ├── entities/     # Member, Gym, Checkin, Payment, ChurnScore
│   │   │   └── use-cases/    # Interfaces dos use cases
│   │   ├── data/             # Implementacoes de use cases + protocols
│   │   │   ├── protocols/    # Interfaces dos repositories
│   │   │   └── use-cases-implementation/
│   │   ├── infra/            # Config, DB, Auth, Jobs
│   │   │   ├── config/       # env.ts + ConfigModule
│   │   │   ├── database/     # TypeORM entities, repositories, seeds
│   │   │   ├── auth/         # Clerk JWT guard
│   │   │   ├── tenant/       # TenantService (contextvars)
│   │   │   └── jobs/         # Scoring + Feature extraction crons
│   │   └── presentation/     # Controllers + DTOs
│   ├── .env                  # Variaveis de ambiente (gitignored)
│   ├── .env.example          # Template
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/              # Next.js app router, componentes, lib
│   ├── .env.local        # Variaveis de ambiente (gitignored)
│   ├── .env.example      # Template
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml    # DB + API + Frontend
├── Makefile
├── CLAUDE.md
└── design.pen
```

### Regras de dependencia (Clean Architecture)
- `domain/` → nao importa nada externo (puro TypeScript)
- `data/` → importa `domain/` e `data/protocols/`
- `infra/database/` → importa `domain/` e `data/protocols/`
- `presentation/` → importa `domain/use-cases/` e DTOs
- `infra/jobs/` → importa `domain/use-cases/`

### Multi-tenant
- `gym_id` em TODAS as tabelas (desnormalizado para evitar JOINs)
- RLS (Row-Level Security) no Postgres: `USING (gym_id = current_setting('app.current_gym_id')::UUID)`
- TenantMiddleware: extrai gym_id do JWT Clerk, seta via TenantService
- Repositories sempre filtram por gym_id (dupla seguranca: codigo + RLS)

## Fases do projeto

### Fase 1 — Sistema de regras (semanas 1-8)
1. Ambiente local (Docker: TimescaleDB)
2. Importacao de CSV (alunos, checkins, pagamentos)
3. Sistema de pontuacao por regras
4. API NestJS
5. Job cron de scoring

### Fase 2 — ML (semanas 9-16, apos gate)
- Gate: 6+ meses de dados, 80+ cancelamentos, 2+ meses de actions_log, 2+ academias
- Dataset com split temporal (nunca aleatorio)
- SMOTE para balanceamento (apenas no treino)
- LogReg para dados escassos (<1000), XGBoost para dados suficientes
- Shadow mode antes de ativar ML
- Retreino automatico mensal (so substitui se PR-AUC melhorar >0.01)
- Regras sempre ficam como fallback

## Conventions

- **Language**: All code in English (tables, columns, variables, functions, classes, routes). Only user-facing strings (churn reasons, UI labels) in PT-BR.
- Date parsing: Brazilian format (dd/mm/yyyy) on CSV import, ISO format internally
- UUIDs as primary keys on all tables
- Docker Compose for local dev (TimescaleDB)
- **Billing**: Stripe for SaaS subscriptions. Upgrade = immediate + proration. Downgrade = end of cycle.
- **Admin**: Separate JWT auth (not Clerk). Roles: superadmin > finance > support.
- **Env files**: `backend_v2/.env` para backend, `frontend/.env.local` para frontend. Sem .env na raiz.

## Design System e UI

### Regras de design
- **Fonte unica: Inter** — nunca usar fontes decorativas ou serif em dashboards. Foco em legibilidade e clareza.
- **Design system**: shadcn/ui importado como `E:` (light mode)
- **Style guide base**: `webapp-02-swisselegant_light`
- **Arquivo de design**: `design.pen` (acessar via ferramentas Pencil MCP)

### Layout Desktop (1440px)
- Sidebar (256px) + Main Content (fill_container)
- Padding do conteudo: [40, 48]
- Gap entre secoes: 32-40px
- KPI cards em row horizontal com gap 16

### Layout Mobile (390px)
- Sem sidebar — header com hamburger menu + logo + bell icon
- Padding do conteudo: 20px
- KPI cards em grid 2x2 (gap 12)
- Tabelas viram cards empilhados verticalmente

### Navegacao Sidebar
- Dashboard (layout-dashboard)
- Alunos (users)
- Pagamentos (credit-card)
- Acoes (zap)
- Configuracoes (settings)

### Badges por Tier
- Critico: `E:YvyLD` (destructive/vermelho)
- Medio: `E:UjXug` (default)
- Baixo: `E:3IiAS` (outline)
- Seguro: `E:WuUMk` (secondary)

### Componentes shadcn (IDs Pencil)
- Sidebar: `E:PV1ln`, Item Active: `E:qCCo8`, Item Default: `E:jBcUh`, Section Title: `E:24cM4`
- Card: `E:pcGlv`
- Button Default: `E:VSnC2`, Outline: `E:C10zH`, Ghost: `E:3f2VW`
- Badge Default: `E:UjXug`, Secondary: `E:WuUMk`, Destructive: `E:YvyLD`, Outline: `E:3IiAS`
- Input: `E:fEUdI`
- Tabs: `E:PbofX`, Active: `E:coMmv`, Inactive: `E:QY0Ka`
- Table Row: `E:LoAux`, Cell: `E:FulCp`, Column Header: `E:w3NML`

### Telas — Status
| Tela | Desktop Node | Mobile Node | Status |
|------|-------------|-------------|--------|
| Dashboard | `Vb9aC` (x:900, y:0) | `zgOLA` (x:2440, y:0) | Completo |
| Alunos Lista | `UW7xU` (x:900, y:720) | `5qb7X` (x:2440, y:900) | Completo |
| Perfil do Aluno | `nB5gZ` (x:900, y:1338) | `QsBuB` (x:2440, y:1912) | Completo |
| Acoes/Retencao | `KUo5r` (x:900, y:2338) | `y7Kq4` (x:2440, y:2912) | Completo |
| Pagamentos | `nGJmb` (x:900, y:3338) | `XycjA` (x:2440, y:3912) | Completo |
| Configuracoes | `zGH22` (x:900, y:4338) | `JuF6y` (x:2440, y:4912) | Completo |

### Configuracoes — Variacoes de Tabs
| Tab | Desktop Node | Mobile Node |
|-----|-------------|-------------|
| Geral (base) | `zGH22` (x:900, y:4338) | `JuF6y` (x:2440, y:4912) |
| Assinatura/Plano | `5YzYb` (x:900, y:5638) | `sPluK` (x:2440, y:6343) |
| Integracoes/Integ. | `CKSM5` (x:900, y:6938) | `5X4zz` (x:2930, y:6343) |
| Importacao | `vcAl9` (x:900, y:8238) | — (incluso em Integ.) |
| Equipe | `Gjm4R` (x:900, y:9538) | `qnpFF` (x:3420, y:6343) |

## Comandos uteis

```bash
# Subir tudo (Docker)
docker-compose up -d

# Dev leve (so infra no Docker, apps locais)
make dev-infra
make dev-api
make dev-front

# Seeds
make seed          # Roda todos (Clerk + DB + Admin stub)
make seed-clerk    # So Clerk + sync gyms
make seed-db       # So sync Clerk → gyms

# Setup completo
make setup         # infra + migrations + seeds
```

## Metricas de sucesso

- **Fase 1**: Acerto retroativo >65% dos cancelamentos, 1+ academia pagante (R$297/mes)
- **Fase 2**: PR-AUC >0.78, Recall >0.70, ML bate regras em 10+ pontos de PR-AUC
