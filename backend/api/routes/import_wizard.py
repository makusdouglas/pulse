"""Import wizard endpoints — preview, commit, and template download."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from api.deps import get_db, get_gym_uuid
from api.schemas.upload import (
    CommitRequest,
    CommitResponse,
    ImportError as ImportErrorSchema,
    ImportStats,
    PreviewResponse,
)
from use_cases.csv_loader import check_existing_members, commit_import
from use_cases.csv_parser import ENTITY_REQUIRED_COLUMNS, parse_csv

router = APIRouter(prefix="/import/wizard", tags=["import"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

_TEMPLATES: dict[str, str] = {
    "members": (
        "nome,email,telefone,matricula_em,cancelamento_em\n"
        "Joao Silva,joao@example.com,11999999999,01/01/2025,"
    ),
    "payments": (
        "email_aluno,vencimento,pago_em,valor,status\n"
        "joao@example.com,10/01/2025,08/01/2025,149.90,pago"
    ),
    "checkins": (
        "email_aluno,data_hora,duracao_min\n"
        "joao@example.com,06/01/2025 07:30,60"
    ),
}


async def _read_upload(file: UploadFile) -> bytes:
    """Stream file in chunks and enforce size limit."""
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(1024 * 64):
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/preview", response_model=PreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> PreviewResponse:
    """Parse a CSV and return rows for preview — nothing is persisted."""
    if entity_type not in ENTITY_REQUIRED_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid entity_type '{entity_type}'. "
                f"Expected: {', '.join(sorted(ENTITY_REQUIRED_COLUMNS))}"
            ),
        )

    raw = await _read_upload(file)

    try:
        result = parse_csv(raw, entity_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    errors = [
        ImportErrorSchema(row=e.row, field=e.field, message=e.message)
        for e in result.errors
    ]

    rows = result.rows

    # For members, mark which emails already exist in the gym
    if entity_type == "members" and rows:
        emails = [r["email"] for r in rows]
        existing = check_existing_members(db, gym_id, emails)
        for row in rows:
            row["exists"] = row["email"] in existing

    return PreviewResponse(
        entity_type=entity_type,
        rows=rows,
        errors=errors,
        total_rows=result.total_rows,
    )


@router.post("/commit", response_model=CommitResponse)
async def commit_csv(
    payload: CommitRequest,
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> CommitResponse:
    """Persist all entities in a single atomic transaction."""
    members_dicts = [r.model_dump() for r in payload.members]
    payments_dicts = [r.model_dump() for r in payload.payments]
    checkins_dicts = [r.model_dump() for r in payload.checkins]

    results = commit_import(db, gym_id, members_dicts, payments_dicts, checkins_dicts)

    all_errors: list[ImportErrorSchema] = []
    for entity, result in results.items():
        for msg in result.errors:
            all_errors.append(ImportErrorSchema(message=f"[{entity}] {msg}"))

    total_loaded = sum(r.inserted + r.updated for r in results.values())
    error_count = len(all_errors)

    if total_loaded == 0 and error_count > 0:
        s = "error"
    elif error_count > 0:
        s = "partial"
    else:
        s = "ok"

    def _to_stats(r) -> ImportStats:
        return ImportStats(
            inserted=r.inserted,
            updated=r.updated,
            skipped=r.skipped,
            total_rows=r.inserted + r.updated + r.skipped,
            error_count=len(r.errors),
        )

    return CommitResponse(
        status=s,
        members=_to_stats(results["members"]),
        payments=_to_stats(results["payments"]),
        checkins=_to_stats(results["checkins"]),
        errors=all_errors,
    )


@router.get("/template/{entity_type}")
async def download_template(entity_type: str) -> StreamingResponse:
    """Return a single-row example CSV for the given entity type."""
    content = _TEMPLATES.get(entity_type)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Unknown entity type '{entity_type}'. "
                f"Expected: {', '.join(sorted(_TEMPLATES))}"
            ),
        )

    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{entity_type}_template.csv"'
        },
    )
