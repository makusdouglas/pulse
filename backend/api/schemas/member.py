"""Pydantic schemas for member endpoints."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from api.schemas.pagination import PaginatedResponse


class MemberResponse(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    status: str
    enrolled_at: date | None = None
    cancelled_at: date | None = None


class MemberListResponse(PaginatedResponse):
    members: list[MemberResponse]


class SignalsResponse(BaseModel):
    dias_sem_treino: int = 0
    queda_frequencia: int = 0
    inadimplencia: int = 0
    queda_duracao: int = 0
    baixa_frequencia: int = 0
    historico_pagamento: int = 0
    aluno_novo: int = 0


class MemberScoreResponse(BaseModel):
    member: MemberResponse
    score: int
    tier: str
    reasons: list[str] = Field(default_factory=list)
    signals: SignalsResponse = Field(default_factory=SignalsResponse)
    computed_at: date
