import { CalculateScoreService } from './calculate-score.service';
import { MemberFeatures } from '../../../domain/entities';
import { Tier } from '../../../domain/enums';

function makeFeatures(
  overrides: Partial<MemberFeatures> = {},
): MemberFeatures {
  return {
    memberId: 'member-1',
    gymId: 'gym-1',
    computedAt: new Date(),
    daysWithoutCheckin: 2,
    freqLast30d: 12,
    freqPrev30d: 10,
    freqTrend: 0.2,
    avgDurationMin: 60,
    avgDurationPrev: 55,
    overduePayments: 0,
    monthsEnrolled: 12,
    latePaymentRatio: 0.0,
    ...overrides,
  };
}

describe('CalculateScoreService', () => {
  let service: CalculateScoreService;

  beforeEach(() => {
    service = new CalculateScoreService();
  });

  it('should return score 0 and tier safe for healthy member', () => {
    const result = service.execute(makeFeatures());
    expect(result.score).toBe(0);
    expect(result.tier).toBe(Tier.SAFE);
    expect(result.reasons).toHaveLength(0);
  });

  // Rule 1 — dias_sem_treino (+40)
  it('should add +40 for > 14 days without checkin', () => {
    const result = service.execute(
      makeFeatures({ daysWithoutCheckin: 20 }),
    );
    expect(result.signals.diasSemTreino).toBe(40);
    expect(result.reasons).toContain('Sem treinar ha 20 dias');
  });

  it('should not trigger rule 1 for exactly 14 days', () => {
    const result = service.execute(
      makeFeatures({ daysWithoutCheckin: 14 }),
    );
    expect(result.signals.diasSemTreino).toBe(0);
  });

  it('should show "Nunca registrou" for 9999+ days', () => {
    const result = service.execute(
      makeFeatures({ daysWithoutCheckin: 9999 }),
    );
    expect(result.signals.diasSemTreino).toBe(40);
    expect(result.reasons).toContain('Nunca registrou um treino');
  });

  // Rule 2 — queda_frequencia (+30)
  it('should add +30 for frequency drop > 50%', () => {
    const result = service.execute(
      makeFeatures({ freqLast30d: 3, freqPrev30d: 10 }),
    );
    expect(result.signals.quedaFrequencia).toBe(30);
  });

  it('should not trigger rule 2 when prev is 0', () => {
    const result = service.execute(
      makeFeatures({ freqLast30d: 0, freqPrev30d: 0 }),
    );
    expect(result.signals.quedaFrequencia).toBe(0);
  });

  it('should not trigger rule 2 for exactly 50% drop', () => {
    const result = service.execute(
      makeFeatures({ freqLast30d: 5, freqPrev30d: 10 }),
    );
    expect(result.signals.quedaFrequencia).toBe(0);
  });

  // Rule 3 — inadimplencia (+20)
  it('should add +20 for overdue payments', () => {
    const result = service.execute(
      makeFeatures({ overduePayments: 2 }),
    );
    expect(result.signals.inadimplencia).toBe(20);
    expect(result.reasons).toContain('2 pagamento(s) em atraso');
  });

  it('should not trigger rule 3 for 0 overdue', () => {
    const result = service.execute(
      makeFeatures({ overduePayments: 0 }),
    );
    expect(result.signals.inadimplencia).toBe(0);
  });

  // Rule 4 — queda_duracao (+15)
  it('should add +15 for duration drop > 30%', () => {
    const result = service.execute(
      makeFeatures({ avgDurationMin: 30, avgDurationPrev: 60 }),
    );
    expect(result.signals.quedaDuracao).toBe(15);
  });

  it('should not trigger rule 4 when prev is null', () => {
    const result = service.execute(
      makeFeatures({ avgDurationMin: 30, avgDurationPrev: null }),
    );
    expect(result.signals.quedaDuracao).toBe(0);
  });

  it('should not trigger rule 4 for exactly 70% of prev', () => {
    const result = service.execute(
      makeFeatures({ avgDurationMin: 42, avgDurationPrev: 60 }),
    );
    expect(result.signals.quedaDuracao).toBe(0);
  });

  // Rule 5 — baixa_frequencia (+10)
  it('should add +10 for < 4 checkins in last 30d', () => {
    const result = service.execute(
      makeFeatures({ freqLast30d: 3 }),
    );
    expect(result.signals.baixaFrequencia).toBe(10);
  });

  it('should not trigger rule 5 for exactly 4 checkins', () => {
    const result = service.execute(
      makeFeatures({ freqLast30d: 4 }),
    );
    expect(result.signals.baixaFrequencia).toBe(0);
  });

  // Rule 6 — historico_pagamento (+10)
  it('should add +10 for > 30% late payment ratio', () => {
    const result = service.execute(
      makeFeatures({ latePaymentRatio: 0.5 }),
    );
    expect(result.signals.historicoPagamento).toBe(10);
    expect(result.reasons).toContain(
      'Historico de atrasos em 50% dos pagamentos',
    );
  });

  it('should not trigger rule 6 for exactly 30%', () => {
    const result = service.execute(
      makeFeatures({ latePaymentRatio: 0.3 }),
    );
    expect(result.signals.historicoPagamento).toBe(0);
  });

  // Rule 7 — aluno_novo (+5)
  it('should add +5 for < 3 months enrolled', () => {
    const result = service.execute(
      makeFeatures({ monthsEnrolled: 1 }),
    );
    expect(result.signals.alunoNovo).toBe(5);
    expect(result.reasons).toContain(
      'Aluno novo (1 mes(es) de matricula)',
    );
  });

  it('should not trigger rule 7 for exactly 3 months', () => {
    const result = service.execute(
      makeFeatures({ monthsEnrolled: 3 }),
    );
    expect(result.signals.alunoNovo).toBe(0);
  });

  // Tier boundaries
  it('should classify tier critical for score >= 60', () => {
    // Rules 1(40) + 3(20) = 60
    const result = service.execute(
      makeFeatures({ daysWithoutCheckin: 20, overduePayments: 1 }),
    );
    expect(result.score).toBe(60);
    expect(result.tier).toBe(Tier.CRITICAL);
  });

  it('should classify tier medium for score 59', () => {
    // Rules 1(40) + 5(10) + 7(5) = 55... let's use 1(40) + 4(15) = 55 → medium
    const result = service.execute(
      makeFeatures({
        daysWithoutCheckin: 20,
        avgDurationMin: 30,
        avgDurationPrev: 60,
      }),
    );
    expect(result.score).toBe(55);
    expect(result.tier).toBe(Tier.MEDIUM);
  });

  it('should classify tier medium for score 30', () => {
    // Rule 2(30)
    const result = service.execute(
      makeFeatures({ freqLast30d: 4, freqPrev30d: 10 }),
    );
    expect(result.score).toBe(30);
    expect(result.tier).toBe(Tier.MEDIUM);
  });

  it('should classify tier low for score 10', () => {
    // Rule 5(10) — freqLast30d < 4
    const result = service.execute(
      makeFeatures({ freqLast30d: 3, freqPrev30d: 4 }),
    );
    expect(result.score).toBe(10);
    expect(result.tier).toBe(Tier.LOW);
  });

  it('should classify tier safe for score 5', () => {
    // Rule 7(5) only
    const result = service.execute(
      makeFeatures({ monthsEnrolled: 2 }),
    );
    expect(result.score).toBe(5);
    expect(result.tier).toBe(Tier.SAFE);
  });

  // Cap at 100
  it('should cap score at 100 when rules exceed 100', () => {
    // All rules: 40+30+20+15+10+10+5 = 130 → capped at 100
    const result = service.execute(
      makeFeatures({
        daysWithoutCheckin: 20,
        freqLast30d: 2,
        freqPrev30d: 10,
        overduePayments: 2,
        avgDurationMin: 20,
        avgDurationPrev: 60,
        latePaymentRatio: 0.5,
        monthsEnrolled: 1,
      }),
    );
    expect(result.score).toBe(100);
    expect(result.tier).toBe(Tier.CRITICAL);
    expect(result.reasons.length).toBe(7);
  });

  // Combination test
  it('should combine multiple rules correctly', () => {
    // Rules 3(20) + 5(10) + 7(5) = 35 → medium
    // freqPrev30d=3 so rule 2 doesn't trigger (2 < 3*0.5=1.5 is false)
    const result = service.execute(
      makeFeatures({
        overduePayments: 1,
        freqLast30d: 2,
        freqPrev30d: 3,
        monthsEnrolled: 2,
      }),
    );
    expect(result.score).toBe(35);
    expect(result.tier).toBe(Tier.MEDIUM);
    expect(result.reasons).toHaveLength(3);
  });
});
