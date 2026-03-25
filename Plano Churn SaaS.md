# Plano de implementação — Churn Intelligence SaaS para Academias

> Regras primeiro → ML depois. Documento de referência completo para desenvolvimento.

---

## Visão geral

| | Fase 1 — Regras | Fase 2 — ML |
|---|---|---|
| Duração | Semanas 1–8 | Semanas 9–16 |
| Objetivo | Produto funcionando, academia pagante | Precisão maior, operação autônoma |
| Dados mínimos | Zero histórico | 6 meses + 80 cancelamentos |
| Complexidade | Baixa | Média |
| Risco | Baixo | Controlado (shadow mode) |

---

## Fase 1 — Sistema de regras

### Etapa 1 · Ambiente local (1 dia)

```bash
# docker-compose.yml
version: "3.9"
services:
  db:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: churndb
      POSTGRES_USER: churn
      POSTGRES_PASSWORD: churn123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
volumes:
  pgdata:
```

```sql
-- Schema completo (rodar após docker-compose up)
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    plano_saas TEXT DEFAULT 'trial',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id),
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    matricula_em DATE NOT NULL,
    cancelamento_em DATE
);

CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    ts TIMESTAMPTZ NOT NULL,
    duracao_min INT,
    origem TEXT DEFAULT 'sistema'
);
SELECT create_hypertable('checkins', 'ts');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    vencimento DATE NOT NULL,
    pagamento_em DATE,
    status TEXT NOT NULL, -- 'pago', 'atrasado', 'pendente'
    valor NUMERIC(10,2)
);

CREATE TABLE member_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    calculado_em DATE NOT NULL,
    dias_sem_treino INT,
    freq_30d INT,
    freq_60_30d INT,
    duracao_media_30d FLOAT,
    duracao_media_60_30d FLOAT,
    pagamentos_em_atraso_90d INT,
    meses_como_aluno INT,
    UNIQUE(member_id, calculado_em)
);

CREATE TABLE churn_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    data DATE NOT NULL,
    score INT NOT NULL,
    tier TEXT NOT NULL, -- 'critico', 'medio', 'baixo', 'seguro'
    modelo_versao TEXT DEFAULT 'regras_v1',
    motivos JSONB,
    UNIQUE(member_id, data)
);

CREATE TABLE actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    score_id UUID REFERENCES churn_scores(id),
    canal TEXT NOT NULL, -- 'whatsapp', 'email', 'fila_gerente'
    tipo_acao TEXT,
    enviado_em TIMESTAMPTZ DEFAULT NOW(),
    aberto_em TIMESTAMPTZ,
    convertido BOOLEAN DEFAULT FALSE
);

-- Índices essenciais
CREATE INDEX idx_checkins_member ON checkins(member_id, ts DESC);
CREATE INDEX idx_payments_member ON payments(member_id, vencimento DESC);
CREATE INDEX idx_scores_member_data ON churn_scores(member_id, data DESC);
CREATE INDEX idx_members_gym ON members(gym_id, status);
```

---

### Etapa 2 · Importar CSV (2 dias)

```python
# import_csv.py
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
import uuid, sys

DB_URL = "postgresql://churn:churn123@localhost:5432/churndb"
engine = create_engine(DB_URL)

def parse_date(s):
    """Tenta múltiplos formatos brasileiros de data."""
    for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]:
        try:
            return datetime.strptime(str(s).strip(), fmt).date()
        except:
            continue
    return None

def import_academia(gym_id: str, checkins_csv: str, pagamentos_csv: str, alunos_csv: str):
    print(f"Importando academia {gym_id}...")

    # Alunos
    df_alunos = pd.read_csv(alunos_csv, encoding='utf-8-sig')
    df_alunos['gym_id'] = gym_id
    df_alunos['matricula_em'] = df_alunos['matricula_em'].apply(parse_date)
    df_alunos['cancelamento_em'] = df_alunos['cancelamento_em'].apply(
        lambda x: parse_date(x) if pd.notna(x) else None
    )
    df_alunos['status'] = df_alunos['cancelamento_em'].apply(
        lambda x: 'cancelado' if x else 'ativo'
    )
    print(f"  Alunos: {len(df_alunos)} ({df_alunos[df_alunos.status=='cancelado'].shape[0]} cancelados)")

    # Check-ins
    df_checkins = pd.read_csv(checkins_csv, encoding='utf-8-sig')
    df_checkins['ts'] = pd.to_datetime(df_checkins['ts'], dayfirst=True)
    df_checkins['duracao_min'] = pd.to_numeric(df_checkins['duracao_min'], errors='coerce').fillna(0).astype(int)
    print(f"  Check-ins: {len(df_checkins)}")

    # Pagamentos
    df_pag = pd.read_csv(pagamentos_csv, encoding='utf-8-sig')
    df_pag['vencimento'] = df_pag['vencimento'].apply(parse_date)
    df_pag['pagamento_em'] = df_pag['pagamento_em'].apply(
        lambda x: parse_date(x) if pd.notna(x) else None
    )
    print(f"  Pagamentos: {len(df_pag)}")

    # Inserir no banco
    with engine.begin() as conn:
        df_alunos[['id','gym_id','nome','status','matricula_em','cancelamento_em']].to_sql(
            'members', conn, if_exists='append', index=False
        )
        df_checkins[['id','member_id','ts','duracao_min']].to_sql(
            'checkins', conn, if_exists='append', index=False
        )
        df_pag[['id','member_id','vencimento','pagamento_em','status','valor']].to_sql(
            'payments', conn, if_exists='append', index=False
        )
    print("  Importação concluída.")

if __name__ == "__main__":
    gym_id = sys.argv[1]  # UUID da academia
    import_academia(gym_id, "checkins.csv", "pagamentos.csv", "alunos.csv")
```

---

### Etapa 3 · Sistema de pontuação (2 dias)

```python
# scoring/rules.py
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class ChurnSignals:
    dias_sem_treino: int = 0
    treinos_30d: int = 0
    treinos_60_30d: int = 0
    duracao_media_30d: float = 0.0
    duracao_media_60_30d: float = 0.0
    pagamento_atrasado_atual: bool = False
    pagamento_atrasado_60d: bool = False
    cancelou_servico_extra: bool = False
    meses_como_aluno: int = 12

def calcular_score(s: ChurnSignals) -> dict:
    pontos = 0
    motivos = []

    if s.dias_sem_treino > 14:
        pontos += 40
        motivos.append(f"{s.dias_sem_treino} dias sem treinar")

    if s.treinos_60_30d > 0:
        queda = (s.treinos_60_30d - s.treinos_30d) / s.treinos_60_30d
        if queda > 0.5:
            pontos += 30
            motivos.append(f"frequência caiu {round(queda*100)}%")

    if s.pagamento_atrasado_atual:
        pontos += 20
        motivos.append("pagamento em atraso")

    if s.duracao_media_60_30d > 0:
        queda_dur = (s.duracao_media_60_30d - s.duracao_media_30d) / s.duracao_media_60_30d
        if queda_dur > 0.3:
            pontos += 15
            motivos.append(f"treinos {round(queda_dur*100)}% mais curtos")

    if s.cancelou_servico_extra:
        pontos += 15
        motivos.append("cancelou serviço extra")

    if s.treinos_30d < 4:
        pontos += 10
        motivos.append("menos de 4 treinos no mês")

    if s.pagamento_atrasado_60d:
        pontos += 10
        motivos.append("histórico de atrasos")

    if s.meses_como_aluno < 3:
        pontos += 5
        motivos.append("aluno novo (menos de 3 meses)")

    pontos = min(pontos, 100)

    if pontos >= 60:
        tier, acao = "critico", "Ligar para o aluno e oferecer benefício"
    elif pontos >= 30:
        tier, acao = "medio", "Enviar WhatsApp personalizado"
    elif pontos >= 10:
        tier, acao = "baixo", "Enviar e-mail de engajamento"
    else:
        tier, acao = "seguro", "Nenhuma ação necessária"

    return {"score": pontos, "tier": tier, "acao": acao, "motivos": motivos}
```

```sql
-- Query SQL de scoring em lote (rodar diariamente)
WITH sinais AS (
  SELECT
    m.id AS member_id,
    m.nome,
    m.gym_id,
    m.matricula_em,
    DATE_PART('day', NOW() - MAX(c.ts))::INT AS dias_sem_treino,
    COUNT(c.id) FILTER (WHERE c.ts >= NOW()-INTERVAL'30d') AS treinos_30d,
    COUNT(c.id) FILTER (WHERE c.ts BETWEEN NOW()-INTERVAL'60d' AND NOW()-INTERVAL'30d') AS treinos_60_30d,
    AVG(c.duracao_min) FILTER (WHERE c.ts >= NOW()-INTERVAL'30d') AS dur_30d,
    AVG(c.duracao_min) FILTER (WHERE c.ts BETWEEN NOW()-INTERVAL'60d' AND NOW()-INTERVAL'30d') AS dur_60_30d,
    MAX(CASE WHEN p.status='atrasado' AND p.vencimento >= NOW()-INTERVAL'30d' THEN 1 ELSE 0 END) AS atraso_atual,
    MAX(CASE WHEN p.status='atrasado' AND p.vencimento >= NOW()-INTERVAL'60d' THEN 1 ELSE 0 END) AS atraso_60d,
    DATE_PART('month', AGE(NOW(), m.matricula_em::TIMESTAMPTZ))::INT AS meses_como_aluno
  FROM members m
  LEFT JOIN checkins c ON c.member_id = m.id
  LEFT JOIN payments p ON p.member_id = m.id
  WHERE m.status = 'ativo' AND m.gym_id = :gym_id
  GROUP BY m.id, m.nome, m.gym_id, m.matricula_em
)
SELECT
  member_id, nome,
  LEAST(100,
    CASE WHEN dias_sem_treino > 14 THEN 40 ELSE 0 END +
    CASE WHEN treinos_60_30d > 0 AND (treinos_60_30d-treinos_30d)::FLOAT/treinos_60_30d > 0.5 THEN 30 ELSE 0 END +
    CASE WHEN atraso_atual = 1 THEN 20 ELSE 0 END +
    CASE WHEN dur_60_30d > 0 AND (dur_60_30d-COALESCE(dur_30d,0))/dur_60_30d > 0.3 THEN 15 ELSE 0 END +
    CASE WHEN treinos_30d < 4 THEN 10 ELSE 0 END +
    CASE WHEN atraso_60d = 1 THEN 10 ELSE 0 END +
    CASE WHEN meses_como_aluno < 3 THEN 5 ELSE 0 END
  ) AS score
FROM sinais
ORDER BY score DESC;
```

---

### Etapa 4 · API FastAPI (3 dias)

```python
# api/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
import uuid
from .database import get_db
from .scoring.rules import calcular_score, ChurnSignals

app = FastAPI(title="Churn Intelligence API")

@app.get("/at-risk")
def get_at_risk(gym_id: str, db: Session = Depends(get_db)):
    """Retorna alunos em risco ordenados por score."""
    result = db.execute(text("""
        WITH sinais AS (
          SELECT m.id AS member_id, m.nome,
            DATE_PART('day', NOW() - MAX(c.ts))::INT AS dias_sem_treino,
            COUNT(c.id) FILTER (WHERE c.ts >= NOW()-INTERVAL'30d') AS treinos_30d,
            COUNT(c.id) FILTER (WHERE c.ts BETWEEN NOW()-INTERVAL'60d' AND NOW()-INTERVAL'30d') AS treinos_60_30d,
            MAX(CASE WHEN p.status='atrasado' AND p.vencimento >= NOW()-INTERVAL'30d' THEN 1 ELSE 0 END) AS atraso_atual
          FROM members m
          LEFT JOIN checkins c ON c.member_id = m.id
          LEFT JOIN payments p ON p.member_id = m.id
          WHERE m.status = 'ativo' AND m.gym_id = :gym_id
          GROUP BY m.id, m.nome
        )
        SELECT member_id, nome,
          LEAST(100,
            CASE WHEN dias_sem_treino > 14 THEN 40 ELSE 0 END +
            CASE WHEN treinos_60_30d > 0 AND (treinos_60_30d-treinos_30d)::FLOAT/treinos_60_30d > 0.5 THEN 30 ELSE 0 END +
            CASE WHEN atraso_atual = 1 THEN 20 ELSE 0 END +
            CASE WHEN treinos_30d < 4 THEN 10 ELSE 0 END
          ) AS score
        FROM sinais WHERE score >= 10
        ORDER BY score DESC
    """), {"gym_id": gym_id})

    rows = result.fetchall()
    return [
        {
            "member_id": str(r.member_id),
            "nome": r.nome,
            "score": r.score,
            "tier": "critico" if r.score >= 60 else "medio" if r.score >= 30 else "baixo"
        }
        for r in rows
    ]

@app.post("/score/{member_id}")
def score_member(member_id: str, db: Session = Depends(get_db)):
    """Calcula score individual com motivos detalhados."""
    # buscar sinais do banco e retornar score
    # (implementar busca de sinais da tabela member_features)
    pass
```

---

### Etapa 5 · Job noturno Celery (2 dias)

```python
# tasks/scoring_job.py
from celery import Celery
from celery.schedules import crontab
from sqlalchemy import create_engine, text
from datetime import date
import logging

app = Celery('churn', broker='redis://localhost:6379/0')

app.conf.beat_schedule = {
    'scoring-noturno': {
        'task': 'tasks.scoring_job.run_daily_scoring',
        'schedule': crontab(hour=3, minute=0),  # 3h da manhã
    },
}

@app.task
def run_daily_scoring():
    engine = create_engine("postgresql://churn:churn123@localhost:5432/churndb")
    logging.info(f"Scoring diário iniciado: {date.today()}")

    with engine.connect() as conn:
        gyms = conn.execute(text("SELECT id FROM gyms WHERE plano_saas != 'inativo'")).fetchall()

    for gym in gyms:
        score_gym.delay(str(gym.id))

@app.task
def score_gym(gym_id: str):
    engine = create_engine("postgresql://churn:churn123@localhost:5432/churndb")
    with engine.begin() as conn:
        # Rodar query de scoring e gravar em churn_scores
        conn.execute(text("""
            INSERT INTO churn_scores (member_id, data, score, tier, modelo_versao)
            SELECT member_id, CURRENT_DATE, score,
                CASE WHEN score >= 60 THEN 'critico'
                     WHEN score >= 30 THEN 'medio'
                     WHEN score >= 10 THEN 'baixo'
                     ELSE 'seguro' END,
                'regras_v1'
            FROM ( /* query de scoring aqui */ ) sub
            ON CONFLICT (member_id, data) DO UPDATE
            SET score = EXCLUDED.score, tier = EXCLUDED.tier
        """))
    logging.info(f"Scoring concluído para academia {gym_id}")
```

---

## Gate para a Fase 2

Antes de migrar para ML, confirmar:

- [ ] Pelo menos 6 meses de dados históricos acumulados
- [ ] Mínimo de 80 cancelamentos no histórico (labels)
- [ ] `actions_log` com 2+ meses de ações e resultados
- [ ] Pelo menos 2 academias usando o produto

---

## Fase 2 — Migração para ML

### Princípio da migração

As regras **nunca somem**. Elas viram o fallback permanente:

```python
def get_score(member_id: str, gym: Gym) -> dict:
    if gym.meses_de_historico >= 6 and gym.total_cancelamentos >= 30:
        return score_ml(member_id)       # ML para quem tem dados
    else:
        return score_regras(member_id)   # Regras para academias novas
```

---

### Etapa 1 · Montar dataset de treino

```python
# ml/dataset.py
import pandas as pd
from sqlalchemy import create_engine

def build_training_dataset(gym_ids: list[str]) -> tuple:
    engine = create_engine("postgresql://churn:churn123@localhost:5432/churndb")

    df = pd.read_sql("""
        SELECT
            mf.member_id,
            mf.calculado_em AS snapshot_date,
            mf.dias_sem_treino,
            mf.freq_30d,
            mf.freq_60_30d,
            mf.duracao_media_30d,
            mf.duracao_media_60_30d,
            mf.pagamentos_em_atraso_90d,
            mf.meses_como_aluno,
            CASE
                WHEN m.cancelamento_em IS NOT NULL
                 AND m.cancelamento_em <= mf.calculado_em + INTERVAL '30 days'
                THEN 1 ELSE 0
            END AS cancelou_30d
        FROM member_features mf
        JOIN members m ON m.id = mf.member_id
        WHERE m.gym_id = ANY(:gym_ids)
        ORDER BY mf.calculado_em
    """, engine, params={"gym_ids": gym_ids})

    # Split temporal — nunca split aleatório
    cutoff = df.snapshot_date.quantile(0.75)
    train = df[df.snapshot_date <= cutoff]
    test = df[df.snapshot_date > cutoff]

    features = [
        'dias_sem_treino', 'freq_30d', 'freq_60_30d',
        'duracao_media_30d', 'duracao_media_60_30d',
        'pagamentos_em_atraso_90d', 'meses_como_aluno'
    ]

    return train[features], test[features], train['cancelou_30d'], test['cancelou_30d']
```

---

### Etapa 2 · Treinar e avaliar

```python
# ml/train.py
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import average_precision_score, classification_report
from imblearn.over_sampling import SMOTE
import xgboost as xgb
import joblib, json
from datetime import date

def treinar_modelo(X_train, X_test, y_train, y_test, versao="v1"):
    # SMOTE apenas no treino
    sm = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X_train, y_train)

    churn_rate = y_train.mean()

    # v1: regressão logística (dados escassos)
    if len(X_train) < 1000:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_res)
        model = LogisticRegression(class_weight='balanced', C=0.1, max_iter=1000)
        model.fit(X_scaled, y_res)
        X_test_eval = scaler.transform(X_test)
    else:
        # v2: XGBoost (dados suficientes)
        scale_pos_weight = (1 - churn_rate) / churn_rate
        model = xgb.XGBClassifier(
            n_estimators=200, max_depth=4,
            learning_rate=0.05, subsample=0.8,
            scale_pos_weight=scale_pos_weight,
            eval_metric='aucpr', early_stopping_rounds=20
        )
        model.fit(X_res, y_res, eval_set=[(X_test, y_test)], verbose=False)
        X_test_eval = X_test
        scaler = None

    y_prob = model.predict_proba(X_test_eval)[:, 1]
    pr_auc = average_precision_score(y_test, y_prob)
    print(f"PR-AUC: {pr_auc:.3f}")
    print(classification_report(y_test, (y_prob >= 0.35).astype(int)))

    # Salvar
    joblib.dump(model, f"models/churn_{versao}.pkl")
    if scaler:
        joblib.dump(scaler, f"models/scaler_{versao}.pkl")
    with open(f"models/meta_{versao}.json", "w") as f:
        json.dump({
            "versao": versao,
            "pr_auc": float(pr_auc),
            "threshold": 0.35,
            "treinado_em": str(date.today()),
            "features": list(X_train.columns)
        }, f)

    return pr_auc
```

---

### Etapa 3 · Shadow mode

```python
# scoring/hybrid.py
import joblib, json
import numpy as np
from .rules import calcular_score, ChurnSignals

# Carregar modelo
try:
    model = joblib.load("models/churn_latest.pkl")
    meta = json.load(open("models/meta_latest.json"))
    ML_DISPONIVEL = True
except:
    ML_DISPONIVEL = False

def score_hibrido(signals: ChurnSignals, gym_historico_meses: int, shadow_mode: bool = False) -> dict:
    resultado_regras = calcular_score(signals)

    if not ML_DISPONIVEL or gym_historico_meses < 6:
        return {**resultado_regras, "fonte": "regras"}

    # Calcular score ML
    X = np.array([[
        signals.dias_sem_treino, signals.treinos_30d,
        signals.treinos_60_30d, signals.duracao_media_30d,
        signals.duracao_media_60_30d, signals.pagamento_atrasado_atual,
        signals.meses_como_aluno
    ]])
    prob = model.predict_proba(X)[0][1]
    score_ml = int(prob * 100)

    if shadow_mode:
        # Logar ambos mas usar só regras
        return {**resultado_regras, "fonte": "regras", "ml_score_shadow": score_ml}

    # Usar ML como fonte principal
    tier = "critico" if score_ml >= 60 else "medio" if score_ml >= 30 else "baixo" if score_ml >= 10 else "seguro"
    return {"score": score_ml, "tier": tier, "fonte": "ml", "motivos": resultado_regras["motivos"]}
```

---

### Etapa 4 · Retreino automático mensal

```python
# tasks/retrain_job.py
from celery import Celery
from celery.schedules import crontab
from ml.dataset import build_training_dataset
from ml.train import treinar_modelo
import shutil, logging
from datetime import date

app = Celery('churn', broker='redis://localhost:6379/0')

app.conf.beat_schedule = {
    'retreino-mensal': {
        'task': 'tasks.retrain_job.retreinar',
        'schedule': crontab(day_of_month=1, hour=2, minute=0),
    },
}

@app.task
def retreinar():
    versao = f"v{date.today().strftime('%Y%m')}"
    logging.info(f"Retreino iniciado: {versao}")

    X_train, X_test, y_train, y_test = build_training_dataset(gym_ids=get_active_gyms())
    novo_pr_auc = treinar_modelo(X_train, X_test, y_train, y_test, versao)

    # Só substitui se melhorar
    pr_auc_atual = carregar_pr_auc_atual()
    if novo_pr_auc > pr_auc_atual + 0.01:
        shutil.copy(f"models/churn_{versao}.pkl", "models/churn_latest.pkl")
        logging.info(f"Modelo atualizado: {pr_auc_atual:.3f} → {novo_pr_auc:.3f}")
    else:
        logging.warning(f"Modelo rejeitado ({novo_pr_auc:.3f} <= {pr_auc_atual:.3f})")
```

---

## Stack de referência

| Componente | Tecnologia | Motivo |
|---|---|---|
| Banco de dados | Postgres + TimescaleDB | Séries temporais de check-in |
| Backend | FastAPI (Python) | Compatível com libs ML |
| Task queue | Celery + Redis | Jobs noturnos e retreino |
| WhatsApp | Evolution API (self-hosted) | Sem custo por mensagem |
| Frontend | Next.js ou React | Dashboard do gestor |
| ML v1 | scikit-learn (LogReg) | Dados escassos |
| ML v2 | XGBoost | 1.000+ exemplos |
| Explicabilidade | SHAP | Motivos por aluno |
| Deploy | Railway ou Render | Barato para MVP |

---

## Métricas de sucesso por fase

### Fase 1 (regras)
- Acerto retroativo > 65% dos cancelamentos históricos
- Pelo menos 1 academia pagando (R$297/mês)
- Gestor usa o dashboard sem ajuda

### Fase 2 (ML)
- PR-AUC > 0.78 no conjunto de teste
- Recall > 0.70 (pega 70%+ dos churns reais)
- Modelo bate as regras em pelo menos 10 pontos de PR-AUC

---

*Gerado em março de 2026 · Churn Intelligence SaaS*
