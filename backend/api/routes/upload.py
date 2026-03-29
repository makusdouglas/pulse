"""CSV import endpoint — POST /import/csv."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from api.deps import get_db, get_gym_uuid
from api.schemas.upload import ImportResponse
from use_cases.csv_loader import load_csv_data
from use_cases.csv_parser import ENTITY_REQUIRED_COLUMNS, parse_csv

router = APIRouter(prefix="/import", tags=["import"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/csv", response_model=ImportResponse)
async def import_csv(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    db: Session = Depends(get_db),
    gym_id: str = Depends(get_gym_uuid),
) -> ImportResponse:
    """Import a CSV file of members, checkins, or payments."""
    if entity_type not in ENTITY_REQUIRED_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid entity_type '{entity_type}'. "
                f"Expected: {', '.join(sorted(ENTITY_REQUIRED_COLUMNS))}"
            ),
        )

    if file.content_type and file.content_type not in (
        "text/csv",
        "application/vnd.ms-excel",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type: {file.content_type}. Expected CSV.",
        )

    # Read in chunks to enforce size limit without buffering oversized files
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(1024 * 64):  # 64 KB chunks
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    raw = b"".join(chunks)

    try:
        parse_result = parse_csv(raw, entity_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if not parse_result.rows:
        return ImportResponse.from_results(
            entity_type=entity_type,
            total_rows=parse_result.total_rows,
            parse_errors=parse_result.errors,
        )

    load_result = load_csv_data(db, gym_id, entity_type, parse_result.rows)

    return ImportResponse.from_results(
        entity_type=entity_type,
        total_rows=parse_result.total_rows,
        parse_errors=parse_result.errors,
        inserted=load_result.inserted,
        updated=load_result.updated,
        skipped=load_result.skipped,
        load_errors=load_result.errors,
    )
