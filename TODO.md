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

### Fase 1 — Celery Jobs (Semana 4)
- [x] backend/tasks/celery_app.py (config + beat schedule)
- [x] backend/tasks/feature_job.py (feature extraction diario)
- [x] backend/tasks/scoring_job.py (scoring diario 3h)

### Fase 1 — Testes (Semana 5)
- [x] backend/tests/conftest.py (fixtures)
- [x] backend/tests/test_scoring.py (7 regras + boundaries + cap)
- [x] backend/tests/test_api.py (endpoints + auth + multi-tenant)
- [x] backend/tests/test_import.py (CSV parsing + validação)
- [x] backend/tests/test_features.py
- [x] Validação retroativa: scoring acerta >65% cancelamentos (stubs — requer dados reais)

### Fase 1 — Backend Routes Novas (Semana 5)
- [x] backend/migrations/002_notifications.sql (CREATE TABLE + RLS)
- [x] backend/api/routes/payments.py (GET /payments — lista paginada)
- [x] backend/api/routes/actions.py (GET /actions + POST /actions)
- [x] backend/api/routes/settings.py (GET /gym/settings + PUT /gym/settings)
- [x] backend/api/routes/notifications.py (GET /notifications + PUT /notifications/{id}/read)
- [x] backend/api/schemas/ (payment.py, action.py, settings.py, notification.py)
- [x] backend/api/main.py (registrar 4 novos routers)
- [x] backend/tests/api/test_new_endpoints.py (25 testes)

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

### 🔴 PRIORIDADE MÁXIMA — Migração Backend → NestJS (backend_v2)

- [ ] Fase 0: Scaffolding NestJS + infra (branch: chore/backend-v2-scaffolding)
- [ ] Fase 1: Domain layer + TypeORM entities (branch: feat/backend-v2-domain)
- [ ] Fase 2: Scoring engine + testes (branch: feat/backend-v2-scoring)
- [ ] Fase 3: Import CSV pipeline + testes (branch: feat/backend-v2-import)
- [ ] Fase 4: API controllers + DTOs + Swagger (branch: feat/backend-v2-controllers)
- [ ] Fase 5: Scheduled jobs com @nestjs/schedule (branch: feat/backend-v2-jobs)
- [ ] Fase 6: Testes E2E + Docker + atualizar commands (branch: feat/backend-v2-e2e-docker)

### Refactor — Import Wizard (pós REVIEW-007)

#### DRY: Extrair componente compartilhado de upload CSV
- **Problema**: `step-members.tsx`, `step-payments.tsx` e `step-checkins.tsx` repetem ~120 linhas idênticas cada — `handleUpload` (validação tamanho/extensão, FormData, chamada preview), `handleDrop`/`handleFileSelect` (event handlers drag-and-drop), o JSX da dropzone (border dashed, ícone, texto, botão), banner de erros de parse, e controles de paginação.
- **Solução**: Criar `<CsvUploadZone>` em `frontend/src/components/import-wizard/csv-upload-zone.tsx`:
  - Props: `entityType: "members" | "payments" | "checkins"`, `fileName: string | null`, `onResult: (rows, fileName) => void`, `onError: (msg) => void`, `onReset: () => void`
  - Encapsula: validação de arquivo, drag-and-drop, chamada ao `POST /import/wizard/preview`, estado de loading, dropzone UI (antes do upload) e file header + "Reenviar CSV" (após upload)
  - Cada step component passa apenas o `entityType` e recebe os rows via callback, renderizando só a tabela específica
- **Também extrair**: `<ParseErrorBanner errors={[]} />` e `<PaginationControls page totalPages onPageChange />` como componentes reutilizáveis
- **Impacto**: Reduz ~360 linhas duplicadas para ~150 linhas totais. Cada step fica com ~80 linhas (só a tabela)
- **Arquivos a modificar**: `step-members.tsx`, `step-payments.tsx`, `step-checkins.tsx`
- **Arquivo novo**: `csv-upload-zone.tsx`
- **Testes**: Verificar que upload, drag-drop, reenvio, e erros funcionam igual em todos os 3 steps

#### Performance: Bulk SQL inserts no csv_loader
- **Problema**: `load_members()`, `load_checkins()` e `load_payments()` em `backend/use_cases/csv_loader.py` inserem registro por registro com `db.execute()` individual. Para um import de 5.000 membros + 10.000 pagamentos + 50.000 checkins = **65.000+ queries SQL** numa única request HTTP. Vai causar timeout (~30s) e lock contention no banco.
- **Detalhamento do problema atual**:
  - `load_members`: 2 queries por membro (SELECT exists + INSERT/UPDATE) = 10.000 queries para 5K membros
  - `load_checkins`: 1 query de resolução de emails + 1 INSERT por checkin = 50.001 queries para 50K checkins
  - `load_payments`: mesmo padrão do checkins
- **Solução para `load_members`**: Usar PostgreSQL `INSERT ... ON CONFLICT` em batch:
  ```sql
  INSERT INTO members (gym_id, name, email, phone, enrolled_at, cancelled_at, status)
  VALUES (:gym_id, :name, :email, :phone, :enrolled_at, :cancelled_at, :status),
         (:gym_id, :name2, :email2, ...),
         ...
  ON CONFLICT (gym_id, email) DO UPDATE SET
    name = EXCLUDED.name, phone = EXCLUDED.phone,
    enrolled_at = EXCLUDED.enrolled_at, cancelled_at = EXCLUDED.cancelled_at,
    status = EXCLUDED.status, updated_at = now()
  RETURNING email, (xmax = 0) AS inserted
  ```
  - O `RETURNING ... (xmax = 0)` permite contar inserted vs updated sem query extra
  - Processar em batches de 500 rows para não exceder limites de parâmetros do PostgreSQL
- **Solução para `load_checkins` e `load_payments`**: Usar `executemany()` ou construir bulk VALUES:
  ```sql
  INSERT INTO checkins (gym_id, member_id, ts, duration_min)
  VALUES (:gym_id, :member_id, :ts, :duration_min),
         ...
  ```
  - A resolução de emails (`_resolve_member_ids`) já é batch — está ok
  - Processar INSERTs em batches de 1000 rows
- **Impacto**: Reduz 65K queries para ~130 queries (batches de 500). Request que leva 30s+ passa a levar <2s.
- **Arquivos a modificar**: `backend/use_cases/csv_loader.py`
- **Atenção**: As funções são usadas tanto pelo wizard (`commit_import`) quanto pelo endpoint legacy (`load_csv_data`). Manter a interface (`LoadResult` com inserted/updated/skipped/errors) idêntica para não quebrar nenhum consumidor.
- **Testes**: Rodar todos os testes existentes (`test_csv_loader.py`, `test_csv_loader_wizard.py`, `test_upload_route.py`, `test_wizard_route.py`) + testes de integração. Adicionar teste com 1000+ rows para validar performance.

### Fase 1 — Frontend (Semanas 5-8)
- [ ] PR1: Scaffolding + Design System (Next.js + TS + Tailwind + shadcn + API client + types + shared components)
- [ ] PR2: Clerk Auth + Layout Tenant (middleware + sidebar 256px + header + mobile sheet + notifications mockup)
- [ ] PR3: Tela Dashboard (4 KPI cards + tabela at-risk + empty state + loading skeleton)
- [ ] PR4: Tela Alunos lista + Perfil do aluno (busca + filtros + paginação + score gauge + signals)
- [ ] PR5: Tela Ações/Retenção + Pagamentos (tabela ações + modal Nova Ação + tabela pagamentos)
- [ ] PR6: Tela Configurações (5 tabs: Geral, Assinatura, Integrações, Importação CSV, Equipe)
- [ ] PR7: Auth + Onboarding (login split layout + recuperar senha 4 steps + onboarding 3 steps)
- [ ] PR8: Admin Panel (auth JWT separada + 6 telas: dashboard, academias, assinaturas, cupons, usuarios)

### Fase 1 — Clerk Webhooks (sync Clerk ↔ DB)
- [ ] Adicionar svix ao requirements.txt + CLERK_WEBHOOK_SECRET ao config.py e .env.example
- [ ] Criar rota POST /webhooks/clerk (validação Svix, fora do TenantMiddleware)
- [ ] Handler: organization.created → criar gym no banco (clerk_org_id = org.id)
- [ ] Handler: organization.updated → atualizar gym (name, etc.)
- [ ] Handler: organization.deleted → soft-delete gym (is_active/deleted_at)
- [ ] Testes: test_webhooks.py (assinatura inválida, created, updated, deleted, evento desconhecido)
- [ ] Atualizar onboarding frontend: step-1 cria org via Clerk SDK, step-3 envia convites

### Fase 1 — Backend Routes (novas, para suportar frontend)
- [ ] GET /payments (lista paginada)
- [ ] GET /actions + POST /actions (CRUD ações de retenção)
- [ ] GET /gym/settings + PUT /gym/settings (configurações academia)
- [ ] GET /notifications + PUT /notifications/{id}/read (notificações)

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
