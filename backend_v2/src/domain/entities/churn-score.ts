import { Tier, ScoreOrigin } from '../enums';

export interface ChurnSignals {
  diasSemTreino: number;
  quedaFrequencia: number;
  inadimplencia: number;
  quedaDuracao: number;
  baixaFrequencia: number;
  historicoPagamento: number;
  alunoNovo: number;
}

export interface ChurnScore {
  memberId: string;
  score: number;
  tier: Tier;
  reasons: string[];
  signals: ChurnSignals;
}

export interface PersistedChurnScore {
  id: string;
  memberId: string;
  gymId: string;
  computedAt: Date;
  score: number;
  tier: Tier;
  reasons: string[];
  origin: ScoreOrigin;
  createdAt: Date;
}
