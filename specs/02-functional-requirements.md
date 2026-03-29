# Pulse — Requisitos Funcionais

## RF-01: Importacao de Dados via CSV

### RF-01.1: Formatos aceitos
- **Entidades**: members, checkins, payments
- **Encoding**: UTF-8-SIG (Excel BOM), fallback Latin-1
- **Datas BR**: `dd/mm/yyyy`, `yyyy-mm-dd`, `dd-mm-yyyy`
- **Datetimes**: `dd/mm/yyyy HH:MM`, `dd/mm/yyyy HH:MM:SS`, `yyyy-mm-ddTHH:MM:SS`
- **Decimal BR**: virgula como separador (`1,50` → `1.50`)
- **Limite**: 10.000 linhas por arquivo, 10 MB max

### RF-01.2: Colunas esperadas por entidade

**members (alunos)**:
| Coluna CSV | Campo DB | Obrigatorio | Validacao |
|------------|----------|-------------|-----------|
| nome | name | Sim | min 1 char |
| email | email | Sim | RFC format, lowercase |
| telefone | phone | Nao | — |
| matricula_em | enrolled_at | Nao | parse date BR |
| cancelamento_em | cancelled_at | Nao | parse date BR |

> Status automatico: se `cancelamento_em` preenchido → `cancelled`, senao → `active`

**checkins**:
| Coluna CSV | Campo DB | Obrigatorio | Validacao |
|------------|----------|-------------|-----------|
| email_aluno | member_id (via lookup) | Sim | email valido |
| data_hora | ts | Sim | parse datetime BR |
| duracao_min | duration_min | Nao | > 0 |

**payments (pagamentos)**:
| Coluna CSV | Campo DB | Obrigatorio | Validacao |
|------------|----------|-------------|-----------|
| email_aluno | member_id (via lookup) | Sim | email valido |
| vencimento | due_date | Sim | parse date BR |
| valor | amount | Sim | > 0 |
| status | status | Nao | mapeamento PT→EN |
| pago_em | paid_at | Nao | parse date BR |

**Mapeamento de status PT→EN**: pago→paid, pendente→pending, atrasado→overdue, cancelado→cancelled

### RF-01.3: Resultado da importacao
- **ok**: tudo importado sem erros
- **partial**: parte importada, parte com erros
- **error**: nada importado, todos com erro
- Resposta inclui: inserted, updated, skipped, total_rows, error_count, lista de erros com row/field/message

### RF-01.4: Resolucao de identidade
- Checkins e payments usam `email_aluno` para resolver `member_id`
- Se email nao encontrado no gym, row e skipped
- Members fazem upsert por (gym_id, email)

---

## RF-02: Scoring Engine (Regras)

### RF-02.1: Feature Extraction

Features computadas por membro, por dia:

| Feature | Calculo | Persistida |
|---------|---------|------------|
| days_without_checkin | Dias desde ultimo checkin (9999 se nunca) | Sim |
| freq_last_30d | Checkins nos ultimos 30 dias | Sim |
| freq_prev_30d | Checkins nos dias 30-60 | Sim |
| freq_trend | ((last - prev) / prev) * 100 | Sim |
| avg_duration_min | Media minutos por sessao (30d) | Sim |
| avg_duration_prev | Media minutos (30-60d) | Nao |
| overdue_payments | Pagamentos atrasados nos ultimos 90d | Sim |
| months_enrolled | Meses desde matricula | Sim |
| late_payment_ratio | % pagamentos atrasados (historico total) | Nao |

### RF-02.2: As 7 Regras de Scoring

| # | Sinal | Condicao | Pontos | Motivo (PT-BR) |
|---|-------|----------|--------|----------------|
| 1 | dias_sem_treino | > 14 dias sem checkin | +40 | "Sem treinar ha mais de 14 dias" |
| 2 | queda_frequencia | freq_30d < 50% de freq_60_30d | +30 | "Queda de frequencia superior a 50%" |
| 3 | inadimplencia | pagamentos atrasados 90d > 0 | +20 | "Pagamento(s) em atraso" |
| 4 | queda_duracao | duracao_30d < 70% de duracao_60_30d | +15 | "Queda na duracao dos treinos" |
| 5 | baixa_frequencia | freq_30d < 4 | +10 | "Menos de 4 treinos no ultimo mes" |
| 6 | historico_pagamento | ratio de atraso > 30% | +10 | "Historico de pagamentos irregulares" |
| 7 | aluno_novo | < 3 meses matriculado | +5 | "Aluno novo (menos de 3 meses)" |

### RF-02.3: Score e Tiers

- **Score** = soma de todos os sinais ativos, **cap em 100**
- **Tiers**:

| Tier | Score | Acao recomendada |
|------|-------|-----------------|
| critical | >= 60 | Ligar |
| medium | >= 30 | WhatsApp |
| low | >= 10 | Email |
| safe | < 10 | Nenhuma |

### RF-02.4: Scoring on-demand vs batch
- **On-demand**: `GET /members/{id}/score` — recalcula features e score ao vivo
- **Batch**: Celery job diario as 03:00 (Sao Paulo) — todos os membros ativos de todas as academias
- Resultado gravado em `churn_scores` com upsert (member_id + computed_at)

---

## RF-03: API Endpoints

### RF-03.1: Autenticacao
- Todos os endpoints (exceto `/health`, `/docs`, `/openapi.json`, `/redoc`) exigem Bearer JWT do Clerk
- gym_id extraido do JWT (org_id v1 ou o.id v2)
- 401 se token ausente/invalido/expirado
- 403 se usuario nao pertence a nenhuma org

### RF-03.2: Endpoints

| Metodo | Path | Descricao | Paginado |
|--------|------|-----------|----------|
| GET | /health | Healthcheck publico | Nao |
| GET | /dashboard/stats | KPIs do dashboard | Nao |
| GET | /at-risk | Membros em risco | Sim |
| GET | /members | Lista de membros | Sim |
| GET | /members/{id}/score | Score detalhado do membro | Nao |
| GET | /payments | Lista de pagamentos | Sim |
| GET | /actions | Lista de acoes de retencao | Sim |
| POST | /actions | Criar acao de retencao | Nao |
| GET | /notifications | Notificacoes | Sim |
| PUT | /notifications/{id}/read | Marcar como lida | Nao |
| PUT | /notifications/read-all | Marcar todas como lidas | Nao |
| GET | /gym/settings | Config da academia | Nao |
| PUT | /gym/settings | Atualizar config | Nao |
| POST | /import/csv | Importar CSV | Nao |

### RF-03.3: Paginacao padrao
- `page`: int, min 1, default 1
- `page_size`: int, min 1, max 100, default 20
- Response sempre inclui: `total`, `page`, `page_size`

### RF-03.4: Dashboard Stats
Retorna:
- total_members (todos)
- active_members (status = active)
- at_risk_count (score >= 10)
- tier_counts (critical, medium, low, safe)
- avg_score (media dos scores)
- recent_scores (top 10 por score DESC)

### RF-03.5: Acoes de Retencao
- **Criar**: member_id + action_type (regex: lowercase alphanumeric + underscore, max 50) + channel (whatsapp|email|phone|in_person|other) + message (1-2000 chars)
- Verifica que membro existe na academia antes de criar
- sent_at gerado automaticamente (now())

### RF-03.6: Configuracoes da Academia
- Campos editaveis: name, email, phone, timezone
- name e timezone nao podem ser null explicitamente
- timezone validado contra `zoneinfo.available_timezones()`
- Apenas campos enviados sao atualizados (PATCH semantics via exclude_unset)

### RF-03.7: Notificacoes
- Tipos: churn_alert, action_result, payment_alert, system
- Response inclui `unread_count` alem da lista paginada
- Marcar individual ou todas como lidas

---

## RF-04: Celery Jobs

| Job | Schedule | Descricao |
|-----|----------|-----------|
| extract_features_all_gyms | Diario 02:30 SP | Extrai features de todos os membros ativos |
| score_all_gyms | Diario 03:00 SP | Calcula score de todos os membros ativos |
| retrain (Fase 2) | Mensal dia 1, 02:00 SP | Retreina modelo ML |

### RF-04.1: Execucao por gym
- Jobs iteram sobre todas as academias
- Cada academia recebe sessao DB propria + context tenant
- Falha em 1 academia nao para as demais
- Jobs sao idempotentes (upsert via ON CONFLICT)

---

## RF-05: Auth e Multi-Tenancy

### RF-05.1: Fluxo de autenticacao
1. Usuario faz login via Clerk (frontend)
2. Clerk emite JWT com org_id
3. Frontend envia JWT em `Authorization: Bearer <token>`
4. Backend valida JWT via JWKS (RS256)
5. Extrai org_id como gym_id
6. Seta tenant context (contextvars + Postgres session)

### RF-05.2: OrgGuard (frontend)
- Componente que garante org ativa
- Se usuario logou sem org selecionada, auto-ativa primeira org
- Forca refresh do token para incluir org_id

### RF-05.3: Clerk Webhooks (a implementar)
- POST /webhooks/clerk (fora do TenantMiddleware)
- Validacao Svix (assinatura)
- organization.created → criar gym no banco
- organization.updated → atualizar gym
- organization.deleted → soft-delete gym

---

## RF-06: Frontend — Telas

### RF-06.1: Autenticacao
- Sign-in e sign-up via componentes Clerk
- Recuperacao de senha (4 steps — UI only)
- Onboarding (3 steps): dados da academia → upload CSV → convite equipe

### RF-06.2: Dashboard
- 4 KPI cards: Alunos Ativos, Em Risco, Criticos, Score Medio
- Tabela de membros em risco com: nome, score, tier badge, motivos, acoes

### RF-06.3: Alunos
- Lista com busca (nome/email), filtro por status, paginacao
- Perfil individual: score gauge circular, signals chart (barras), motivos, botoes de contato

### RF-06.4: Acoes de Retencao
- Tabela de acoes realizadas
- Modal para criar nova acao (membro, canal, mensagem)

### RF-06.5: Pagamentos
- Tabela paginada com filtros por membro e status

### RF-06.6: Configuracoes (5 tabs)
- Geral: perfil da academia + preferencias de notificacao
- Assinatura: plano atual, billing, upgrade/cancel
- Integracoes: WhatsApp (Evolution API)
- Importacao: upload CSV por entidade
- Equipe: convites + lista de membros com roles

### RF-06.7: Admin Panel (separado)
- Auth propria (JWT, nao Clerk)
- Roles: superadmin > finance > support
- Telas: dashboard, academias, assinaturas, cupons, usuarios

---

## RF-07: Billing (Stripe)

- Planos com: name, slug, stripe_price_id, price_cents, interval, max_members, features
- **Upgrade**: imediato com prorateamento
- **Downgrade**: agendado para fim do ciclo
- Invoices rastreados com stripe_invoice_id
- Cupons com: code, desconto (% ou centavos), max_uses, validade

---

## RF-08: ML (Fase 2 — apos gate)

### RF-08.1: Treinamento
- Split temporal (75th percentile) — NUNCA aleatorio
- SMOTE apenas no treino
- LogReg para < 1000 amostras (class_weight=balanced, C=0.1)
- XGBoost para >= 1000 (n_estimators=200, max_depth=4, lr=0.05, subsample=0.8)
- StandardScaler antes do treino
- Threshold default: 0.35

### RF-08.2: Substituicao de modelo
- So substitui se PR-AUC melhorar > 0.01
- Regras sempre ficam como fallback
- Shadow mode: loga ML score ao lado de regras, mas usa regras para decisoes

### RF-08.3: Explicabilidade
- SHAP: TreeExplainer (XGBoost) ou LinearExplainer (LogReg)
- Top 3 features por membro em portugues
- Integrado com campo `reasons` do score
