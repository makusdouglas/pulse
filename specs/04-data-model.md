# Pulse — Data Model

## Diagrama ER Simplificado

```
gyms 1──N members 1──N checkins (hypertable)
  │         │    └──N payments
  │         │    └──1 member_features
  │         │    └──N churn_scores
  │         └──N actions_log
  │         └──N notifications
  │
  ├──1 subscriptions N──1 plans
  │         └──N invoices
  │
  └──N coupon_usage N──1 coupons
                          └──N promotions

admin_users 1──N admin_sessions
```

## Core Tables

### gyms
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK, default gen_random_uuid() | — |
| name | VARCHAR(255) | NOT NULL | Nome da academia |
| slug | VARCHAR(100) | UNIQUE | URL-friendly identifier |
| email | VARCHAR(255) | — | Email de contato |
| phone | VARCHAR(30) | — | Telefone |
| clerk_org_id | VARCHAR(255) | UNIQUE | ID da Organization no Clerk |
| timezone | VARCHAR(50) | DEFAULT 'America/Sao_Paulo' | Timezone IANA |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Trigger auto-update |

### members
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| name | VARCHAR(255) | NOT NULL | Nome do aluno |
| email | VARCHAR(255) | — | Email |
| phone | VARCHAR(30) | — | Telefone |
| enrolled_at | DATE | DEFAULT CURRENT_DATE | Data de matricula |
| cancelled_at | DATE | — | Data de cancelamento |
| status | VARCHAR(20) | CHECK (active, inactive, cancelled) | — |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Trigger auto-update |

**Indexes**: idx_members_gym_id, idx_members_gym_status (filtered)
**RLS**: `gym_id = current_setting('app.current_gym_id')::UUID`

### checkins (Hypertable)
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | — | — |
| member_id | UUID | FK members CASCADE | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| ts | TIMESTAMPTZ | DEFAULT now() | Timestamp do checkin |
| duration_min | INTEGER | — | Duracao em minutos |

**PK**: (id, ts) — composta para hypertable
**Hypertable**: chunk interval 7 dias
**Indexes**: idx_checkins_gym_id, idx_checkins_member
**RLS**: sim

### payments
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | — |
| member_id | UUID | FK members CASCADE | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| due_date | DATE | NOT NULL | Vencimento |
| paid_at | DATE | — | Data de pagamento |
| amount | NUMERIC(10,2) | NOT NULL | Valor |
| status | VARCHAR(20) | CHECK (pending, paid, overdue, cancelled) | — |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes**: idx_payments_gym_id, idx_payments_member, idx_payments_gym_status
**RLS**: sim

### member_features
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | — |
| member_id | UUID | FK members CASCADE | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| computed_at | DATE | NOT NULL | Data do calculo |
| days_without_checkin | INTEGER | — | Dias sem treinar |
| freq_last_30d | INTEGER | — | Checkins ultimos 30d |
| freq_prev_30d | INTEGER | — | Checkins 30-60d |
| freq_trend | NUMERIC(5,2) | — | % mudanca frequencia |
| avg_duration_min | NUMERIC(5,1) | — | Media minutos 30d |
| overdue_payments | INTEGER | — | Pagamentos atrasados 90d |
| months_enrolled | INTEGER | — | Meses matriculado |

**UNIQUE**: (member_id, computed_at)
**Indexes**: idx_member_features_gym
**RLS**: sim

### churn_scores
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | — |
| member_id | UUID | FK members CASCADE | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| computed_at | DATE | NOT NULL | Data do calculo |
| score | INTEGER | CHECK (0-100) | Score de risco |
| tier | VARCHAR(10) | CHECK (critical, medium, low, safe) | — |
| reasons | JSONB | DEFAULT '[]' | Motivos em PT-BR |
| origin | VARCHAR(10) | CHECK (rules, ml) | Origem do score |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**UNIQUE**: (member_id, computed_at)
**Indexes**: idx_churn_scores_gym, idx_churn_scores_gym_tier
**RLS**: sim

### actions_log
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | — |
| member_id | UUID | FK members CASCADE | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| action_type | VARCHAR(50) | NOT NULL | Tipo da acao |
| channel | VARCHAR(30) | DEFAULT 'whatsapp' | Canal de contato |
| message | TEXT | — | Mensagem enviada |
| sent_at | TIMESTAMPTZ | DEFAULT now() | — |
| result | VARCHAR(30) | CHECK (null, delivered, read, replied, failed, pending) | — |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes**: idx_actions_log_gym, idx_actions_log_member
**RLS**: sim

### notifications
| Coluna | Tipo | Constraints | Descricao |
|--------|------|-------------|-----------|
| id | UUID | PK | — |
| gym_id | UUID | FK gyms CASCADE | Tenant |
| member_id | UUID | FK members CASCADE | Opcional |
| type | VARCHAR(30) | CHECK (churn_alert, action_result, payment_alert, system) | — |
| title | VARCHAR(255) | NOT NULL | — |
| description | TEXT | — | — |
| is_read | BOOLEAN | DEFAULT false | — |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes**: idx_notifications_gym (gym_id, created_at DESC), idx_notifications_gym_unread (filtered WHERE is_read = false)
**RLS**: sim

---

## Billing Tables

### plans
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK |
| name | VARCHAR(100) | Nome do plano |
| slug | VARCHAR(50) | UNIQUE |
| stripe_price_id | VARCHAR(100) | UNIQUE |
| price_cents | INTEGER | Preco em centavos |
| currency | VARCHAR(3) | DEFAULT 'brl' |
| interval | VARCHAR(10) | monthly, yearly |
| max_members | INTEGER | Limite de alunos |
| features | JSONB | DEFAULT '{}' |
| active | BOOLEAN | DEFAULT true |

### subscriptions
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK |
| gym_id | UUID | FK gyms |
| plan_id | UUID | FK plans |
| stripe_subscription_id | VARCHAR(100) | UNIQUE |
| status | VARCHAR(20) | active, past_due, cancelled, trialing |
| current_period_start | TIMESTAMPTZ | — |
| current_period_end | TIMESTAMPTZ | — |
| cancel_at_period_end | BOOLEAN | DEFAULT false |

**RLS**: sim

### invoices
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK |
| gym_id | UUID | FK gyms |
| subscription_id | UUID | FK subscriptions |
| stripe_invoice_id | VARCHAR(100) | UNIQUE |
| amount_cents | INTEGER | — |
| status | VARCHAR(20) | draft, open, paid, void |
| due_date | DATE | — |
| paid_at | TIMESTAMPTZ | — |

**RLS**: sim

### coupons
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK |
| code | VARCHAR(50) | UNIQUE |
| discount_pct | INTEGER | CHECK (1-100) |
| discount_cents | INTEGER | — |
| max_uses | INTEGER | — |
| used_count | INTEGER | DEFAULT 0 |
| valid_from | TIMESTAMPTZ | — |
| valid_until | TIMESTAMPTZ | — |
| active | BOOLEAN | DEFAULT true |

### coupon_usage
RLS: sim (gym_id)

### promotions
Vincula plan_id ou coupon_id com periodo de validade.

---

## Admin Tables

### admin_users
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE |
| password_hash | VARCHAR(255) | bcrypt |
| role | VARCHAR(20) | CHECK (superadmin, finance, support) |
| active | BOOLEAN | DEFAULT true |

### admin_sessions
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID | PK |
| admin_user_id | UUID | FK admin_users |
| token | VARCHAR(500) | UNIQUE |
| ip_address | VARCHAR(45) | — |
| user_agent | TEXT | — |
| expires_at | TIMESTAMPTZ | — |

---

## Triggers

```sql
CREATE FUNCTION update_updated_at() ...
-- Aplicado em: gyms, members, subscriptions, admin_users
-- Seta updated_at = now() em todo UPDATE
```

---

## Row-Level Security

Tabelas com RLS habilitado:
- members, checkins, payments, member_features, churn_scores, actions_log
- subscriptions, invoices, coupon_usage, notifications

Policy padrao:
```sql
CREATE POLICY tenant_{table} ON {table}
    USING (gym_id = current_setting('app.current_gym_id')::UUID);
```

## Migration Tracking

```sql
CREATE TABLE IF NOT EXISTS _migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
);
```
