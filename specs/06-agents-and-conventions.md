# Pulse — Agentes, Convencoes e Workflow

## 1. Mapa de Agentes

### Hierarquia

```
/workflow (orquestrador)
    ├── /db          — Schema, migrations, RLS
    ├── /api         — FastAPI endpoints, schemas
    ├── /score       — Engine de scoring (7 regras)
    ├── /import      — Parser + loader CSV
    ├── /tasks       — Celery jobs, schedules
    ├── /ml          — Pipeline ML (Fase 2)
    ├── /frontend    — Next.js, componentes, responsividade
    ├── /ux          — Design system, acessibilidade, Pencil MCP
    ├── /test        — Pytest, fixtures, cobertura
    ├── /arch        — Qualidade, padroes, anti-patterns
    ├── /security    — OWASP, LGPD, rate limiting
    ├── /git         — Branches, commits, PRs
    └── /devops      — Docker, deploy, infra
```

### Pipelines por tipo de task

| Tipo de Task | Pipeline de Agentes |
|-------------|-------------------|
| Database | `/db` → `/test` → `/arch` |
| API endpoint | `/api` → `/test` → `/security` → `/arch` |
| Scoring | `/score` → `/test` → `/arch` |
| Import CSV | `/import` → `/test` → `/arch` |
| Celery job | `/tasks` → `/test` → `/arch` |
| ML pipeline | `/ml` → `/test` → `/arch` |
| Frontend | `/frontend` → `/ux` → `/arch` |
| Infra | `/devops` → `/arch` |

### Handoffs entre agentes

| De | Para | Quando |
|----|------|--------|
| /api | /score | Precisa de logica de scoring |
| /api | /db | Precisa de schema ou migration |
| /score | /ml | Fase 2, modo hibrido |
| /score | /db | Schema de member_features/churn_scores |
| /import | /db | Schema das tabelas de destino |
| /import | /api | Endpoint de upload |
| /tasks | /score | Job de scoring diario |
| /tasks | /ml | Job de retreino mensal |
| /frontend | /api | Endpoints consumidos |
| /frontend | /ux | Design system, acessibilidade |
| /ux | /frontend | Implementar componentes |
| /security | /api, /score, /devops | Corrigir vulnerabilidades |

---

## 2. Convencoes de Codigo

### Linguagem
- **Codigo**: tudo em ingles (tabelas, colunas, variaveis, funcoes, classes, rotas)
- **UI strings**: PT-BR (motivos de churn, labels, mensagens de erro user-facing)
- **Comentarios**: ingles

### Python (Backend)
```
- Type hints obrigatorios em funcoes publicas
- Funcoes < 50 linhas
- Dataclasses para domain objects (nao dicts anonimos)
- Pydantic para request/response schemas
- Queries parametrizadas (text() com :param)
- logging (nunca print)
- Imports organizados: stdlib → third-party → local
```

### TypeScript (Frontend)
```
- Interfaces tipadas para todas as respostas de API
- Path alias @/* para imports
- Strict mode habilitado
- Componentes funcionais com hooks
- SWR para data fetching
```

### SQL
```
- UUIDs como PKs (gen_random_uuid())
- TIMESTAMPTZ para timestamps
- ON CONFLICT para upserts
- Migrations sequenciais e idempotentes
- Indexes em FKs e colunas de filtro
- JSONB para dados semi-estruturados (reasons, features)
```

### Nomenclatura

| Contexto | Padrao | Exemplo |
|----------|--------|---------|
| Tabelas | snake_case plural | `churn_scores` |
| Colunas | snake_case | `days_without_checkin` |
| Python funcoes | snake_case | `calculate_score()` |
| Python classes | PascalCase | `ChurnSignals` |
| API routes | kebab-case | `/at-risk` |
| TS interfaces | PascalCase | `MemberResponse` |
| TS funcoes | camelCase | `useApi()` |
| CSS classes | Tailwind utilities | `flex items-center gap-4` |
| Branches | type/short-desc | `feat/scoring-engine` |
| Commits | conventional | `feat(api): add risk endpoint` |

---

## 3. Git Workflow

### Branching
```
homolog (base)
    └── feat/my-feature
    └── fix/null-score
    └── refactor/api-auth
    └── chore/docker-setup
```

1. `git checkout homolog`
2. `git fetch origin && git pull origin homolog`
3. `git checkout -b <type>/<short-description>`

### Commits (Conventional Commits)
```
<type>(<scope>): <description>

[body — explica o WHY]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types**: feat, fix, refactor, chore, test, docs
**Scopes**: db, api, scoring, tasks, import, ml, frontend, devops, auth, config

### PRs
- Target: `homolog`
- Template: Summary (bullets) + Test Plan (checklist)
- Footer: `Generated with Claude Code`
- Sempre criar PR apos commit em branch nova

### Regras de seguranca Git
- NO force push para homolog/main
- NO .env, secrets, .pkl nos commits
- NO --no-verify
- NO amend em commits publicados
- Usar git add com arquivos especificos

---

## 4. Workflow do Orchestrador

```
Step 0: Criar branch
Step 1: Identificar task no TODO.md
Step 2: Classificar e montar pipeline de agentes
Step 3: Executar pipeline (sem pausas entre agentes)
Step 4: Commit (conventional commits)
Step 5: Code review (/code-reviewer) — usuario analisa findings
Step 6: Atualizar TODO.md
Step 7: Criar PR (target: homolog)
Step 8: Resumo final (tabela agentes + status + PR link)
```

### Regras do Workflow
- `/test` e `/arch` OBRIGATORIOS em todo pipeline
- `/code-reviewer` OBRIGATORIO antes de PR
- Nao criar PR sem usuario revisar code review findings
- Se task depende de outra, informar e sugerir executar dependencia primeiro
- Agentes rodam end-to-end sem pausas

---

## 5. Configuracoes do Ambiente Claude Code

### Permissions (project .claude/settings.json)
```json
{
  "permissions": {
    "allow": ["Write", "Edit"]
  }
}
```

### MCP Servers
- **Postman**: disponivel para testes de API
- **Pencil**: disponivel para design (design.pen) — desabilitado no local settings

### Memory System
Memoria persistente em `/Users/markusdouglas/.claude/projects/.../memory/`:
- **project_***: decisoes de projeto (nome, arquitetura, design)
- **feedback_***: correcoes e validacoes do usuario (9 entradas)
- Memorias sao lidas no inicio de cada conversa via MEMORY.md

---

## 6. Checklist do /arch (Code Review)

Cada PR deve passar por:

- [ ] Separacao de camadas (routes finas, logica em use_cases)
- [ ] Type hints em funcoes publicas
- [ ] Filtro multi-tenant (gym_id do JWT, nunca parametro)
- [ ] Clerk JWT auth em toda rota protegida
- [ ] SQL parametrizado (sem concatenacao)
- [ ] Nomes em ingles (exceto UI strings PT-BR)
- [ ] Pure functions onde possivel
- [ ] Cobertura de testes
- [ ] Sem circular imports
- [ ] Variaveis de ambiente (sem hardcode)
- [ ] Logging (sem print)
- [ ] Funcoes < 50 linhas

---

## 7. Checklist do /security (Audit)

Por rota:

- [ ] Tem `Depends(get_current_gym_id)`
- [ ] Query filtra por gym_id do JWT
- [ ] Inputs validados
- [ ] Paginacao com max limit
- [ ] Mensagens de erro genericas (sem stack trace)
- [ ] Sem PII em logs
- [ ] SQL parametrizado
- [ ] Retorna apenas campos necessarios

Classificacao de severidade: CRITICAL → HIGH → MEDIUM → LOW
