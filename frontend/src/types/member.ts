import type { Tier, MemberStatus } from "./dashboard";

export interface MemberResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  enrolled_at: string | null;
  cancelled_at: string | null;
}

export interface MemberListResponse {
  members: MemberResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface SignalsResponse {
  dias_sem_treino: number;
  queda_frequencia: number;
  inadimplencia: number;
  queda_duracao: number;
  baixa_frequencia: number;
  historico_pagamento: number;
  aluno_novo: number;
}

export interface MemberScoreResponse {
  member: MemberResponse;
  score: number;
  tier: Tier;
  reasons: string[];
  signals: SignalsResponse;
  computed_at: string;
}
