import { Injectable } from '@nestjs/common';
import { CalculateScore } from '../../../domain/use-cases/scoring/calculate-score';
import {
  MemberFeatures,
  ChurnScore,
  ChurnSignals,
} from '../../../domain/entities';
import { Tier } from '../../../domain/enums';

function classifyTier(score: number): Tier {
  if (score >= 60) return Tier.CRITICAL;
  if (score >= 30) return Tier.MEDIUM;
  if (score >= 10) return Tier.LOW;
  return Tier.SAFE;
}

@Injectable()
export class CalculateScoreService implements CalculateScore {
  execute(features: MemberFeatures): ChurnScore {
    const signals: ChurnSignals = {
      diasSemTreino: 0,
      quedaFrequencia: 0,
      inadimplencia: 0,
      quedaDuracao: 0,
      baixaFrequencia: 0,
      historicoPagamento: 0,
      alunoNovo: 0,
    };
    const reasons: string[] = [];

    // Rule 1 — dias_sem_treino (> 14 days without checkin → +40)
    if (features.daysWithoutCheckin > 14) {
      signals.diasSemTreino = 40;
      if (features.daysWithoutCheckin >= 9999) {
        reasons.push('Nunca registrou um treino');
      } else {
        reasons.push(`Sem treinar ha ${features.daysWithoutCheckin} dias`);
      }
    }

    // Rule 2 — queda_frequencia (freq dropped > 50% vs previous period → +30)
    if (
      features.freqPrev30d > 0 &&
      features.freqLast30d < features.freqPrev30d * 0.5
    ) {
      signals.quedaFrequencia = 30;
      reasons.push(
        `Frequencia caiu de ${features.freqPrev30d} para ${features.freqLast30d} treinos/mes`,
      );
    }

    // Rule 3 — inadimplencia (overdue payments in last 90 days → +20)
    if (features.overduePayments > 0) {
      signals.inadimplencia = 20;
      reasons.push(`${features.overduePayments} pagamento(s) em atraso`);
    }

    // Rule 4 — queda_duracao (avg duration dropped > 30% vs previous period → +15)
    if (
      features.avgDurationPrev != null &&
      features.avgDurationMin != null &&
      features.avgDurationPrev > 0 &&
      features.avgDurationMin < features.avgDurationPrev * 0.7
    ) {
      signals.quedaDuracao = 15;
      reasons.push(
        `Duracao media caiu de ${Math.round(features.avgDurationPrev)} para ${Math.round(features.avgDurationMin)} min`,
      );
    }

    // Rule 5 — baixa_frequencia (< 4 checkins in last 30 days → +10)
    if (features.freqLast30d < 4) {
      signals.baixaFrequencia = 10;
      reasons.push(
        `Apenas ${features.freqLast30d} treino(s) nos ultimos 30 dias`,
      );
    }

    // Rule 6 — historico_pagamento (> 30% of payments paid late → +10)
    if (features.latePaymentRatio > 0.3) {
      signals.historicoPagamento = 10;
      const pct = Math.round(features.latePaymentRatio * 100);
      reasons.push(`Historico de atrasos em ${pct}% dos pagamentos`);
    }

    // Rule 7 — aluno_novo (< 3 months enrolled → +5)
    if (features.monthsEnrolled < 3) {
      signals.alunoNovo = 5;
      reasons.push(
        `Aluno novo (${features.monthsEnrolled} mes(es) de matricula)`,
      );
    }

    const rawScore =
      signals.diasSemTreino +
      signals.quedaFrequencia +
      signals.inadimplencia +
      signals.quedaDuracao +
      signals.baixaFrequencia +
      signals.historicoPagamento +
      signals.alunoNovo;

    const score = Math.min(rawScore, 100);
    const tier = classifyTier(score);

    return {
      memberId: features.memberId,
      score,
      tier,
      reasons,
      signals,
    };
  }
}
