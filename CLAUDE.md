# Pulse — Churn Intelligence SaaS para Academias

## Visao geral

O app se chama **Pulse**. SaaS B2B que prediz churn de alunos em academias. Duas fases: regras primeiro, ML depois. O produto analisa frequencia de treinos, pagamentos e comportamento para gerar um score de risco (0-100) e recomendar acoes de retencao.

## Stack

| Componente | Tecnologia |
|---|---|
| Banco de dados | Postgres + TimescaleDB |
| Backend | FastAPI (Python) |
| Task queue | Celery + Redis |
| WhatsApp | Evolution API (self-hosted) |
| Frontend | Next.js (TypeScript) |
| Auth | Clerk (Organizations = multi-tenant) |
| ML v1 | scikit-learn (LogisticRegression) |
| ML v2 | XGBoost |
| Explicabilidade | SHAP |
| Deploy | Railway ou Render |

## Arquitetura

- **Monorepo**: `backend/` (Python) + `frontend/` (Next.js) + `docker-compose.yml` na raiz
- **Banco**: TimescaleDB com hypertable em `checkins` (serie temporal)
- **Tabelas principais**: `gyms`, `members`, `checkins`, `payments`, `member_features`, `churn_scores`, `actions_log`
- **Scoring**: Sistema de pontuacao baseado em regras (`backend/scoring/rules.py`) com tiers: critico (>=60), medio (>=30), baixo (>=10), seguro (<10)
- **Jobs**: Celery Beat roda scoring diario as 3h e retreino mensal no dia 1
- **API**: FastAPI com endpoints `/at-risk` e `/score/{member_id}`
- **Auth**: Clerk — JWT no backend, componentes prontos no frontend. Clerk Organizations = 1 org = 1 academia (org_id = gym_id)

### Estrutura de pastas
```
pulse/
├── backend/
│   ├── api/              # FastAPI — rotas, schemas, auth, middleware
│   ├── scoring/          # Logica de negocio do scoring
│   ├── tasks/            # Celery — orquestracao de jobs
│   ├── ml/               # Pipeline ML (Fase 2)
│   ├── importacao/       # Pipeline de importacao CSV
│   ├── migrations/       # SQL migrations sequenciais
│   ├── models/           # Modelos ML serializados (.pkl)
│   ├── tests/            # pytest
│   ├── schema.sql        # DDL de referencia
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/              # Next.js app router, componentes, lib
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml    # DB + Redis + API + Worker + Frontend
├── .env.example
├── CLAUDE.md
└── design.pen
```

## Fases do projeto

### Fase 1 — Sistema de regras (semanas 1-8)
1. Ambiente local (Docker: TimescaleDB + Redis)
2. Importacao de CSV (alunos, checkins, pagamentos)
3. Sistema de pontuacao por regras
4. API FastAPI
5. Job noturno Celery

### Fase 2 — ML (semanas 9-16, apos gate)
- Gate: 6+ meses de dados, 80+ cancelamentos, 2+ meses de actions_log, 2+ academias
- Dataset com split temporal (nunca aleatorio)
- SMOTE para balanceamento (apenas no treino)
- LogReg para dados escassos (<1000), XGBoost para dados suficientes
- Shadow mode antes de ativar ML
- Retreino automatico mensal (so substitui se PR-AUC melhorar >0.01)
- Regras sempre ficam como fallback

## Convencoes

- Idioma do codigo: nomes de variaveis e tabelas em portugues (ex: `dias_sem_treino`, `matricula_em`)
- Datas em formato brasileiro (dd/mm/yyyy) na importacao
- UUIDs como primary keys em todas as tabelas
- Docker Compose para ambiente local (TimescaleDB + Redis)

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

## Comandos uteis

```bash
# Subir tudo (Docker)
docker-compose up -d

# Dev leve (so infra no Docker, apps locais)
docker-compose up db redis
cd backend && uvicorn api.main:app --reload
cd backend && celery -A tasks.celery_app worker --beat --loglevel=info
cd frontend && npm run dev
```

## Metricas de sucesso

- **Fase 1**: Acerto retroativo >65% dos cancelamentos, 1+ academia pagante (R$297/mes)
- **Fase 2**: PR-AUC >0.78, Recall >0.70, ML bate regras em 10+ pontos de PR-AUC
