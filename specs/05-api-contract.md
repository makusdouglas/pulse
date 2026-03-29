# Pulse — API Contract

## Base

- **URL**: `http://localhost:8000` (dev)
- **Auth**: Bearer JWT (Clerk) em todos os endpoints exceto publicos
- **Content-Type**: application/json (exceto upload que e multipart/form-data)
- **Tenant**: gym_id extraido automaticamente do JWT (nunca como parametro)

## Codigos de Erro Padrao

| Codigo | Significado |
|--------|------------|
| 401 | Token ausente, invalido ou expirado |
| 403 | Usuario sem organization no Clerk |
| 404 | Recurso nao encontrado (no contexto do tenant) |
| 413 | Arquivo excede 10 MB |
| 422 | Validacao falhou (Pydantic) |

---

## Endpoints

### GET /health
**Auth**: Nenhuma
```json
// Response 200
{ "status": "ok" }
```

---

### GET /dashboard/stats
**Auth**: Bearer JWT

```json
// Response 200
{
  "total_members": 150,
  "active_members": 120,
  "at_risk_count": 35,
  "tier_counts": {
    "critical": 8,
    "medium": 12,
    "low": 15,
    "safe": 85
  },
  "avg_score": 22.5,
  "recent_scores": [
    {
      "member_id": "uuid",
      "member_name": "Maria Silva",
      "score": 85,
      "tier": "critical",
      "reasons": ["Sem treinar ha mais de 14 dias", "Pagamento(s) em atraso"],
      "computed_at": "2026-03-29"
    }
  ]
}
```

---

### GET /at-risk
**Auth**: Bearer JWT

| Param | Tipo | Default | Validacao |
|-------|------|---------|-----------|
| tier | string? | null | critical, medium, low, safe |
| page | int | 1 | min 1 |
| page_size | int | 20 | min 1, max 100 |

```json
// Response 200
{
  "members": [
    {
      "member_id": "uuid",
      "member_name": "Joao Santos",
      "score": 75,
      "tier": "critical",
      "reasons": ["Sem treinar ha mais de 14 dias", "Queda de frequencia superior a 50%"],
      "computed_at": "2026-03-29"
    }
  ],
  "total": 35,
  "page": 1,
  "page_size": 20,
  "tier_counts": {
    "critical": 8,
    "medium": 12,
    "low": 15,
    "safe": 85
  }
}
```

> `tier_counts` sempre retorna contagem total (nao filtrada), mesmo quando `tier` e aplicado.

---

### GET /members
**Auth**: Bearer JWT

| Param | Tipo | Default | Validacao |
|-------|------|---------|-----------|
| page | int | 1 | min 1 |
| page_size | int | 20 | min 1, max 100 |
| search | string? | null | alfanumerico + acentos + @./-espaco |
| status | string? | null | active, inactive, cancelled |

```json
// Response 200
{
  "members": [
    {
      "id": "uuid",
      "name": "Ana Costa",
      "email": "ana@email.com",
      "phone": "(11) 99999-0000",
      "status": "active",
      "enrolled_at": "2025-06-15",
      "cancelled_at": null
    }
  ],
  "total": 120,
  "page": 1,
  "page_size": 20
}
```

> Search faz ILIKE em name e email.

---

### GET /members/{member_id}/score
**Auth**: Bearer JWT

```json
// Response 200
{
  "member": {
    "id": "uuid",
    "name": "Ana Costa",
    "email": "ana@email.com",
    "phone": "(11) 99999-0000",
    "status": "active",
    "enrolled_at": "2025-06-15",
    "cancelled_at": null
  },
  "score": 45,
  "tier": "medium",
  "reasons": [
    "Queda de frequencia superior a 50%",
    "Menos de 4 treinos no ultimo mes",
    "Aluno novo (menos de 3 meses)"
  ],
  "signals": {
    "dias_sem_treino": 0,
    "queda_frequencia": 30,
    "inadimplencia": 0,
    "queda_duracao": 0,
    "baixa_frequencia": 10,
    "historico_pagamento": 0,
    "aluno_novo": 5
  },
  "computed_at": "2026-03-29"
}
```

> Score e recalculado on-demand (nao usa cache).
> 404 se membro nao existe no tenant.

---

### GET /payments
**Auth**: Bearer JWT

| Param | Tipo | Default |
|-------|------|---------|
| member_id | string? | null |
| status | string? | null (pending, paid, overdue, cancelled) |
| page | int | 1 |
| page_size | int | 20 |

```json
// Response 200
{
  "payments": [
    {
      "id": "uuid",
      "member_id": "uuid",
      "member_name": "Joao Santos",
      "amount": "150.00",
      "due_date": "2026-03-15",
      "paid_at": "2026-03-14",
      "status": "paid"
    }
  ],
  "total": 45,
  "page": 1,
  "page_size": 20
}
```

> Ordenado por due_date DESC. JOIN com members para member_name.

---

### GET /actions
**Auth**: Bearer JWT

| Param | Tipo | Default |
|-------|------|---------|
| member_id | string? | null |
| page | int | 1 |
| page_size | int | 20 |

```json
// Response 200
{
  "actions": [
    {
      "id": "uuid",
      "member_id": "uuid",
      "member_name": "Maria Silva",
      "action_type": "follow_up",
      "channel": "whatsapp",
      "message": "Oi Maria, sentimos sua falta!",
      "sent_at": "2026-03-28T14:30:00Z",
      "result": "delivered"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

---

### POST /actions
**Auth**: Bearer JWT

```json
// Request
{
  "member_id": "uuid",
  "action_type": "follow_up",
  "channel": "whatsapp",
  "message": "Oi Maria, sentimos sua falta na academia!"
}
```

| Campo | Tipo | Validacao |
|-------|------|-----------|
| member_id | UUID | Obrigatorio, deve existir no tenant |
| action_type | string | max 50, regex: lowercase alphanumeric + underscore |
| channel | string | whatsapp (default), email, phone, in_person, other |
| message | string | min 1, max 2000 |

```json
// Response 201
{
  "id": "uuid",
  "member_id": "uuid",
  "member_name": "Maria Silva",
  "action_type": "follow_up",
  "channel": "whatsapp",
  "message": "Oi Maria, sentimos sua falta na academia!",
  "sent_at": "2026-03-29T10:00:00Z",
  "result": null
}
```

---

### GET /notifications
**Auth**: Bearer JWT

| Param | Tipo | Default |
|-------|------|---------|
| page | int | 1 |
| page_size | int | 20 |

```json
// Response 200
{
  "notifications": [
    {
      "id": "uuid",
      "type": "churn_alert",
      "title": "Aluno em risco critico",
      "description": "Maria Silva atingiu score 85",
      "is_read": false,
      "member_id": "uuid",
      "created_at": "2026-03-29T03:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20,
  "unread_count": 3
}
```

---

### PUT /notifications/{notification_id}/read
**Auth**: Bearer JWT
**Response**: 204 No Content
**Error**: 404 se nao encontrada no tenant

---

### PUT /notifications/read-all
**Auth**: Bearer JWT
**Response**: 204 No Content

---

### GET /gym/settings
**Auth**: Bearer JWT

```json
// Response 200
{
  "id": "uuid",
  "name": "Academia Pulse",
  "slug": "academia-pulse",
  "email": "contato@pulse.com",
  "phone": "(11) 3333-4444",
  "timezone": "America/Sao_Paulo"
}
```

---

### PUT /gym/settings
**Auth**: Bearer JWT

```json
// Request (todos opcionais, mas name e timezone nao podem ser null)
{
  "name": "Academia Pulse Premium",
  "email": "novo@pulse.com",
  "phone": "(11) 5555-6666",
  "timezone": "America/Fortaleza"
}
```

> PATCH semantics: apenas campos enviados sao atualizados.
> timezone validado contra `zoneinfo.available_timezones()`.

```json
// Response 200 — retorna settings atualizadas
{
  "id": "uuid",
  "name": "Academia Pulse Premium",
  "slug": "academia-pulse",
  "email": "novo@pulse.com",
  "phone": "(11) 5555-6666",
  "timezone": "America/Fortaleza"
}
```

---

### POST /import/csv
**Auth**: Bearer JWT
**Content-Type**: multipart/form-data

| Campo | Tipo | Validacao |
|-------|------|-----------|
| file | UploadFile | CSV, max 10 MB |
| entity_type | string | members, checkins, payments |

```json
// Response 200
{
  "status": "ok",
  "entity_type": "members",
  "stats": {
    "inserted": 45,
    "updated": 5,
    "skipped": 0,
    "total_rows": 50,
    "error_count": 0
  },
  "errors": []
}

// Response 200 (partial)
{
  "status": "partial",
  "entity_type": "checkins",
  "stats": {
    "inserted": 180,
    "updated": 0,
    "skipped": 20,
    "total_rows": 200,
    "error_count": 20
  },
  "errors": [
    {
      "row": 15,
      "field": "email_aluno",
      "message": "Member not found: joao@inexistente.com"
    }
  ]
}
```

**Status logic**:
- `ok`: 0 erros
- `partial`: alguns importados + alguns erros
- `error`: 0 importados + todos com erro

---

## Schemas Pydantic

### Base
```python
class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
```

### Tipos compartilhados
```python
Tier = Literal["critical", "medium", "low", "safe"]
MemberStatus = Literal["active", "inactive", "cancelled"]
Channel = Literal["whatsapp", "email", "phone", "in_person", "other"]
ActionResult = Literal["delivered", "read", "replied", "failed", "pending"]
NotificationType = Literal["churn_alert", "action_result", "payment_alert", "system"]
PaymentStatus = Literal["pending", "paid", "overdue", "cancelled"]
```
