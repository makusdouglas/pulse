# Pulse — Requisitos Nao-Funcionais

## RNF-01: Seguranca

### RNF-01.1: Autenticacao e Autorizacao
- JWT Clerk validado via JWKS (RS256)
- Claims obrigatorios: `exp`, `iat`, `sub`
- org_id extraido do payload (v1: `org_id`, v2: `o.id`)
- Token expirado → 401
- Sem org → 403
- Rotas publicas: `/health`, `/docs`, `/openapi.json`, `/redoc`

### RNF-01.2: Isolamento Multi-Tenant
- **Codigo**: toda query filtra por gym_id
- **Banco**: RLS em todas as tabelas tenant-aware
- **Sessao**: `SET LOCAL app.current_gym_id` por request
- **Celery**: tenant propagado via `set_tenant()` por job
- **IDOR**: impossivel acessar dados de outra academia (RLS bloqueia)

### RNF-01.3: Prevencao de Injecao
- Todas as queries usam `text()` com parametros nomeados (`:param`)
- Nenhuma concatenacao de string em SQL
- Input de busca validado com regex: alfanumerico + acentos + @./-espaco

### RNF-01.4: CORS
- Origens configuraveis via `CORS_ORIGINS` (comma-separated)
- NUNCA `["*"]` em producao

### RNF-01.5: Upload
- Tipos aceitos: text/csv, application/vnd.ms-excel, application/octet-stream
- Stream em chunks de 64KB
- Limite: 10 MB
- Limite: 10.000 linhas

### RNF-01.6: Admin
- Auth separada do Clerk (JWT proprio)
- Roles: superadmin > finance > support
- Sessoes com token unico, IP, user-agent, expiracao
- Passwords com bcrypt

### RNF-01.7: Secrets
- Todas as credenciais via .env (nunca hardcoded)
- .env no .gitignore
- Modelos ML (.pkl, .json) no .gitignore
- Seeds com dados reais no .gitignore

---

## RNF-02: Performance

### RNF-02.1: Banco de Dados
- **Connection pool**: size=10, max_overflow=20 (30 conexoes max)
- **pool_pre_ping**: valida conexoes antes de usar
- **Hypertable**: checkins particionados por tempo (chunks de 7 dias)
- **Indexes**: em FKs, colunas de filtro, e queries frequentes
- **RLS**: filtro no nivel do Postgres (sem overhead no app)

### RNF-02.2: Paginacao
- max page_size = 100 (previne queries pesadas)
- COUNT(*) separado do SELECT paginado
- Ordenacao consistente em todos os endpoints

### RNF-02.3: Celery
- `task_acks_late=True` (garante reprocessamento em caso de crash)
- `worker_prefetch_multiplier=1` (1 task por vez por worker)
- Per-gym error handling (falha isolada)
- Jobs idempotentes (upsert, nao insert)

### RNF-02.4: Feature Extraction
- Batch SQL com CTEs (1 query por gym, nao por membro)
- Features computadas 1x por dia (02:30), scoring usa features pre-computadas (03:00)

---

## RNF-03: Confiabilidade

### RNF-03.1: Idempotencia
- CSV import: upsert por (gym_id, email) para members
- Feature extraction: upsert por (member_id, computed_at)
- Scoring: upsert por (member_id, computed_at)
- Celery jobs: safe to re-run

### RNF-03.2: Transacoes
- `get_db()` faz commit on success, rollback on exception
- `autocommit=False`, `autoflush=False`
- Cada gym processa em sessao DB separada nos jobs

### RNF-03.3: Migrations
- SQL sequenciais e idempotentes (safe to re-run)
- Tabela `_migrations` rastreia aplicacoes
- ON CONFLICT na insercao de migration tracker

---

## RNF-04: Observabilidade

### RNF-04.1: Logging
- Jobs logam: inicio, fim, metricas (count, tier distribution)
- Feature extraction loga contagem por gym
- Scoring loga distribuicao de tiers
- Usar `logging` (nunca `print`)

### RNF-04.2: Healthcheck
- `GET /health` retorna `{"status": "ok"}`
- Docker healthchecks: pg_isready (db), redis-cli ping (redis)

---

## RNF-05: Arquitetura e Qualidade de Codigo

### RNF-05.1: Clean Architecture
- `domain/` puro Python (sem deps externas)
- `use_cases/` orquestra repositories
- `api/` e uma camada fina (so chama use_cases)
- `infra/` nao importa dominio
- `tasks/` chama use_cases diretamente

### RNF-05.2: Convencoes de Codigo

**Linguagem**:
- Todo codigo em ingles (tabelas, colunas, variaveis, funcoes, classes, rotas)
- Apenas strings user-facing em PT-BR (motivos de churn, labels de UI)

**Python**:
- Type hints obrigatorios
- Funcoes < 50 linhas
- Sem business logic em routes (delegar para use_cases)
- Sem circular imports
- Sem try/except silencioso
- Sem config hardcoded
- Sem dead code

**SQL**:
- Queries parametrizadas (`:param`)
- ON CONFLICT para upserts
- Indexes em FKs e colunas de filtro
- Migrations idempotentes

**TypeScript**:
- Interfaces tipadas para todas as respostas de API
- Path alias `@/*` para imports
- Strict mode

### RNF-05.3: Anti-patterns proibidos
- Business logic em routes
- Funcoes > 50 linhas
- Dicts anonimos (usar dataclasses/Pydantic)
- try/except generico sem tratamento
- Configuracao hardcoded
- Dead code
- Circular imports
- Concatenacao de SQL
- `print()` em vez de `logging`
- CORS `["*"]` em producao

---

## RNF-06: Testabilidade

### RNF-06.1: Framework e Estrutura
- pytest com fixtures em conftest.py
- Estrutura por feature: api/, auth/, scoring/, import_csv/, etc.
- Mock de psycopg2 antes dos imports (evita dep de lib C)
- Mock de Celery (FakeCelery, FakeCrontab)
- Mock de Clerk JWT para testes de API

### RNF-06.2: Testes obrigatorios
- **Scoring**: cada regra individual + combinacoes + boundaries de tier + cap em 100
- **API**: status code, estrutura de response, paginacao, filtros, multi-tenant
- **CSV**: encoding, formatos de data, validacao, mapeamento de status
- **Features**: trend calculation, batch extraction

### RNF-06.3: Testes de seguranca
- Isolamento multi-tenant (gym A nao ve dados de gym B)
- Auth ausente/invalida
- Validacao de input

---

## RNF-07: UI e UX

### RNF-07.1: Design System
- **Fonte**: Inter (NUNCA serif ou decorativa em dashboards)
- **UI Library**: shadcn/ui (light mode)
- **Style guide**: webapp-02-swisselegant_light
- **Cores**: HSL via CSS custom properties
- **Border radius**: 0.5rem

### RNF-07.2: Responsividade

| Aspecto | Desktop (1440px) | Mobile (390px) |
|---------|------------------|----------------|
| Sidebar | 256px fixa | Sheet (hamburger) |
| Padding | [40, 48] | 20px |
| KPI cards | Row horizontal, gap 16 | Grid 2x2, gap 12 |
| Tabelas | Table normal | Cards empilhados |
| Gap secoes | 32-40px | — |

### RNF-07.3: Acessibilidade (WCAG 2.1 AA)
- Contraste de cor minimo 4.5:1
- Navegacao por teclado
- Aria labels em todos os interativos
- Focus indicators visiveis
- Labels em todos os campos de form
- Touch targets minimo 44px (mobile)
- Respeitar `prefers-reduced-motion`

### RNF-07.4: Estados de UI
- **Loading**: Skeleton placeholders (nunca tela em branco)
- **Empty**: Icone + titulo + descricao + CTA opcional
- **Error**: Mensagem clara + como resolver
- **Success**: Toast notification

### RNF-07.5: Microcopy
- Verbos orientados a acao
- Explicar o que aconteceu E como resolver
- Dialogs de confirmacao descrevem consequencias
- Tooltips concisos
- Datas em formato BR (dd/mm/yyyy) na UI

---

## RNF-08: Deploy

### RNF-08.1: Plataforma
- Railway ou Render
- Root directory por servico (backend/, frontend/)
- Frontend: Vercel como alternativa

### RNF-08.2: Docker
- Backend: Python 3.11-slim + gcc + libpq-dev
- Frontend: Node 20-alpine, output standalone
- Volumes para hot-reload em dev

### RNF-08.3: Variaveis de Ambiente
- DATABASE_URL, REDIS_URL
- CLERK_SECRET_KEY, CLERK_JWKS_URL
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_API_URL
- CORS_ORIGINS
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- ADMIN_JWT_SECRET

---

## RNF-09: Git e CI

### RNF-09.1: Branching
- Branch base: `homolog` (nao main)
- Tipos: feat/, fix/, refactor/, chore/, test/, docs/
- Criar branch: checkout homolog → fetch → pull → checkout -b

### RNF-09.2: Commits
- Conventional Commits: `<type>(<scope>): <description>`
- Scopes: db, api, scoring, tasks, import, ml, frontend, devops, auth, config
- Co-author: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

### RNF-09.3: PRs
- Target: homolog
- Template: Summary + Test Plan
- Includes: `Generated with Claude Code`

### RNF-09.4: Proibicoes
- NO force push para homolog/main
- NO .env/secrets/pkl nos commits
- NO --no-verify
- NO amend em commits publicados
- Usar `git add <arquivo>` especifico (nunca `git add .`)

### RNF-09.5: CI/CD
- Nenhum pipeline configurado atualmente
- A configurar: GitHub Actions ou similar

---

## RNF-10: Privacidade (LGPD)

- PII nunca em logs
- Politica de retencao de dados (a definir)
- Capacidade de export/delete de dados do membro
- Consentimento para coleta via CSV (a implementar)
- Mensagens de erro genericas (sem stack trace em producao)
- Retornar apenas campos necessarios nas respostas
