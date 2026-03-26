# Pulse — Board de Tarefas

> Kanban: TODO → DOING → TO TEST → TESTING → DONE

---

## DONE

### Fundação
- [x] Documentação do projeto (CLAUDE.md, Plano Churn SaaS.md)
- [x] Design UI completo no Pencil (design.pen) — 5 telas desktop + mobile
- [x] Agents Claude Code (11 slash commands configurados)
- [x] Decisões de arquitetura: monorepo backend/ + frontend/, Clerk auth, Next.js

### Fase 1 — Infraestrutura (Semana 1)
- [x] Inicializar git + .gitignore
- [x] docker-compose.yml (db + redis + api + worker + frontend)
- [x] backend/Dockerfile
- [x] frontend/Dockerfile
- [x] .env.example com todas as vars
- [x] backend/requirements.txt
- [x] backend/pyproject.toml (pytest + ruff config)
- [x] Makefile com comandos uteis
- [x] Clean Architecture: domain/, use_cases/, repositories/, api/, infra/

### Fase 1 — Banco de Dados (Semana 1)
- [x] backend/schema.sql (DDL completo)
- [x] backend/migrations/001_initial.sql
- [x] Rodar schema no TimescaleDB e validar hypertable

### Fase 1 — Backend Core (Semana 2)
- [x] backend/infra/config.py (pydantic-settings)
- [x] backend/infra/database.py (SQLAlchemy engine + SessionLocal)
- [x] backend/infra/tenant.py (contextvars para gym_id)
- [x] backend/api/auth.py (Clerk JWT → org_id = gym_id)
- [x] backend/api/deps.py (DI: get_db, get_current_gym_id)
- [x] backend/api/middleware.py (TenantMiddleware)
- [x] backend/api/main.py (FastAPI app + CORS + /health)

### Fase 1 — Importação CSV (Semana 2)
- [x] backend/use_cases/csv_parser.py (datas BR, encoding, validação)
- [x] backend/use_cases/csv_loader.py (inserção com upsert)
- [x] backend/api/routes/upload.py (POST /import/csv)

### Fase 1 — Scoring Engine (Semana 3)
- [x] backend/use_cases/calculate_score.py (ChurnSignals + calculate_score — 7 regras)
- [x] backend/use_cases/features.py (queries de feature extraction)

### Fase 1 — API Endpoints (Semana 3-4)
- [x] backend/api/routes/risk.py (GET /at-risk)
- [x] backend/api/routes/members.py (GET /members, GET /members/{id}/score)
- [x] backend/api/routes/dashboard.py (GET /dashboard/stats)
- [x] backend/api/schemas/ (Pydantic models: member, score, dashboard)

---

## DOING

_(nada em andamento)_

---

## TO TEST

_(nada aguardando teste)_

---

## TESTING

_(nada em teste)_

---

## TODO

### Fase 1 — Celery Jobs (Semana 4)
- [ ] backend/tasks/celery_app.py (config + beat schedule)
- [ ] backend/tasks/feature_job.py (feature extraction diario)
- [ ] backend/tasks/scoring_job.py (scoring diario 3h)

### Fase 1 — Testes (Semana 5)
- [ ] backend/tests/conftest.py (fixtures)
- [ ] backend/tests/test_scoring.py (7 regras + boundaries + cap)
- [ ] backend/tests/test_api.py (endpoints + auth + multi-tenant)
- [ ] backend/tests/test_import.py (CSV parsing + validação)
- [ ] backend/tests/test_features.py
- [ ] Validação retroativa: scoring acerta >65% cancelamentos

### Fase 1 — Frontend (Semanas 5-7)
- [ ] frontend/ setup (Next.js + TypeScript + Tailwind + shadcn)
- [ ] Clerk integration (@clerk/nextjs + middleware)
- [ ] Layout: Sidebar + Header + Mobile menu
- [ ] Tela: Dashboard (KPIs + tabela risco)
- [ ] Tela: Alunos lista (busca + filtros + paginação)
- [ ] Tela: Perfil do aluno (score + histórico)
- [ ] Tela: Ações/Retenção
- [ ] Tela: Pagamentos

### Fase 1 — Security Audit (Semana 7)
- [ ] /security audit em todas as rotas
- [ ] Rate limiting em endpoints críticos
- [ ] Limites de paginação e upload
- [ ] Validação multi-tenant (IDOR check)

### Fase 1 — Deploy (Semana 8)
- [ ] Deploy API no Railway/Render
- [ ] Deploy Worker no Railway/Render
- [ ] Deploy Frontend no Railway/Render/Vercel
- [ ] Postgres + Redis gerenciados
- [ ] Clerk production keys
- [ ] Teste e2e em produção

---

### Fase 2 — ML (Semanas 9-16, após gate)
- [ ] Verificar gate criteria (6m dados, 80+ cancelamentos, 2+ academias)
- [ ] backend/ml/dataset.py (split temporal + SMOTE)
- [ ] backend/ml/train.py (LogReg + XGBoost)
- [ ] backend/scoring/hybrid.py (ponte rules↔ML)
- [ ] Shadow mode (logar ML ao lado de regras)
- [ ] backend/tasks/retrain_job.py (retreino mensal)
- [ ] SHAP integration (explicabilidade)
- [ ] backend/tests/test_ml.py
- [ ] Ativar ML se bater regras em 10+ pontos PR-AUC
