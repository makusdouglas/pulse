"""Member endpoints — list members + on-demand scoring."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.deps import get_db, get_gym_uuid
from api.schemas.member import (
    MemberListResponse,
    MemberResponse,
    MemberScoreResponse,
    SignalsResponse,
)
from use_cases.calculate_score import score_member

router = APIRouter(prefix="/members", tags=["members"])

MAX_PAGE_SIZE = 100


@router.get("", response_model=MemberListResponse)
def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=MAX_PAGE_SIZE),
    search: str | None = Query(None, max_length=200, pattern=r"^[a-zA-Z0-9@.\s\-àáâãéêíóôõúüçÀÁÂÃÉÊÍÓÔÕÚÜÇ]+$"),
    member_status: str | None = Query(None, alias="status", pattern="^(active|inactive|cancelled)$"),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> MemberListResponse:
    """List members for the gym with optional search and status filter."""
    conditions = ["m.gym_id = :gym_id"]
    params: dict = {"gym_id": gym_id}

    if member_status:
        conditions.append("m.status = :status")
        params["status"] = member_status

    if search:
        conditions.append("(m.name ILIKE :search OR m.email ILIKE :search)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)

    count_row = db.execute(
        text(f"SELECT COUNT(*) FROM members m WHERE {where}"),  # noqa: S608
        params,
    ).scalar()
    total = count_row or 0

    offset = (page - 1) * page_size
    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(
        text(
            f"SELECT id, name, email, phone, status, enrolled_at, cancelled_at "  # noqa: S608
            f"FROM members m WHERE {where} "
            f"ORDER BY name ASC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    members = [
        MemberResponse(
            id=str(r.id),
            name=r.name,
            email=r.email,
            phone=r.phone,
            status=r.status,
            enrolled_at=r.enrolled_at,
            cancelled_at=r.cancelled_at,
        )
        for r in rows
    ]

    return MemberListResponse(
        members=members, total=total, page=page, page_size=page_size
    )


@router.get("/{member_id}/score", response_model=MemberScoreResponse)
def get_member_score(
    member_id: str,
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> MemberScoreResponse:
    """Score a member on demand and return full breakdown."""
    member_row = db.execute(
        text(
            "SELECT id, name, email, phone, status, enrolled_at, cancelled_at "
            "FROM members WHERE id = :member_id AND gym_id = :gym_id"
        ),
        {"member_id": member_id, "gym_id": gym_id},
    ).fetchone()

    if member_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member {member_id} not found",
        )

    result = score_member(db, gym_id, member_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not score member {member_id}",
        )

    member = MemberResponse(
        id=str(member_row.id),
        name=member_row.name,
        email=member_row.email,
        phone=member_row.phone,
        status=member_row.status,
        enrolled_at=member_row.enrolled_at,
        cancelled_at=member_row.cancelled_at,
    )

    return MemberScoreResponse(
        member=member,
        score=result.score,
        tier=result.tier,
        reasons=result.reasons,
        signals=SignalsResponse(
            dias_sem_treino=result.signals.dias_sem_treino,
            queda_frequencia=result.signals.queda_frequencia,
            inadimplencia=result.signals.inadimplencia,
            queda_duracao=result.signals.queda_duracao,
            baixa_frequencia=result.signals.baixa_frequencia,
            historico_pagamento=result.signals.historico_pagamento,
            aluno_novo=result.signals.aluno_novo,
        ),
        computed_at=date.today(),
    )
