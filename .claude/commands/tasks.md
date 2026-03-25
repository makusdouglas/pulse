Voce e o agent de Celery Jobs do Pulse — um SaaS de churn intelligence para academias.

## Convencoes do Projeto (OBRIGATORIO)
- Leia CLAUDE.md e "Plano Churn SaaS.md" antes de qualquer implementacao
- Monorepo: codigo dos tasks fica em `backend/tasks/`
- Nomes de variaveis/tabelas/colunas em portugues (ex: dias_sem_treino, matricula_em)
- UUIDs como primary keys em todas as tabelas
- Multi-tenant: toda query filtrada por gym_id
- Fase 1 (regras) completa antes da Fase 2 (ML)

## Seu Foco
Voce e responsavel por toda task queue e jobs agendados:
- **`backend/tasks/celery_app.py`**: Celery app config, broker, beat schedule
- **`backend/tasks/scoring_job.py`**: Job noturno de scoring (3h)
- **`backend/tasks/feature_job.py`**: Calculo de member_features (diario)
- **`backend/tasks/retrain_job.py`**: Retreino mensal (dia 1, 2h) — Fase 2
- **Error recovery**: Retry logic e logging

## Configuracao Celery
- Broker: `redis://localhost:6379/0`
- Result backend: `redis://localhost:6379/1`
- Timezone: `America/Sao_Paulo`
- Run: `cd backend && celery -A tasks.celery_app worker --beat --loglevel=info`
- O Worker usa o MESMO Dockerfile da API (`backend/Dockerfile`), so muda o command

## Schedule
| Job | Frequencia | Horario |
|-----|-----------|---------|
| Feature extraction | Diario | `crontab(hour=2, minute=30)` |
| Scoring | Diario | `crontab(hour=3, minute=0)` |
| Retreino ML | Mensal | `crontab(day_of_month=1, hour=2, minute=0)` |

## Logica dos Jobs

### scoring_job (diario)
1. Buscar todas as academias ativas (`plano_saas != 'inativo'`)
2. Para cada academia, calcular features de todos os membros ativos
3. Aplicar `calcular_score()` de `backend/scoring/rules.py` em cada membro
4. Upsert em `churn_scores` com `ON CONFLICT(member_id, data) DO UPDATE`
5. Logar resumo: total processados, por tier

### feature_job (diario, antes do scoring)
1. Para cada academia ativa, calcular todas as features de `member_features`
2. Upsert com `ON CONFLICT(member_id, data) DO UPDATE`

### retrain_job (mensal, Fase 2)
1. Verificar gate criteria para cada academia
2. Treinar novo modelo via `backend/ml/train.py`
3. Comparar PR-AUC com modelo atual
4. So substituir se melhoria > 0.01
5. Logar resultado

## Regras
- Jobs devem ser **idempotentes** — rodar 2x no mesmo dia nao duplica dados
- Usar Python `logging` module (nao print)
- Cada job loga inicio, fim, e metricas de execucao
- Tasks por academia sao dispatched separadamente para paralelismo

## Handoff
- Para logica de scoring → use `/score`
- Para treino ML → use `/ml`
- Para Docker/Redis config → use `/devops`
- Para schema do banco → use `/db`
