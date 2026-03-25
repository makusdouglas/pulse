"""Pydantic schemas for CSV import endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field

from use_cases.csv_parser import ParseError


class ImportStats(BaseModel):
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    total_rows: int = 0
    error_count: int = 0


class ImportError(BaseModel):
    row: int | None = None
    field: str | None = None
    message: str


class ImportResponse(BaseModel):
    status: str = Field(description="'ok' or 'partial' or 'error'")
    entity_type: str
    stats: ImportStats
    errors: list[ImportError] = Field(default_factory=list)

    @classmethod
    def from_results(
        cls,
        entity_type: str,
        total_rows: int,
        parse_errors: list[ParseError],
        inserted: int = 0,
        updated: int = 0,
        skipped: int = 0,
        load_errors: list[str] | None = None,
    ) -> ImportResponse:
        errors: list[ImportError] = []

        for pe in parse_errors:
            errors.append(
                ImportError(row=pe.row, field=pe.field, message=pe.message)
            )

        for msg in load_errors or []:
            errors.append(ImportError(message=msg))

        error_count = len(errors)
        total_loaded = inserted + updated

        if total_loaded == 0 and error_count > 0:
            status = "error"
        elif error_count > 0:
            status = "partial"
        else:
            status = "ok"

        return cls(
            status=status,
            entity_type=entity_type,
            stats=ImportStats(
                inserted=inserted,
                updated=updated,
                skipped=skipped,
                total_rows=total_rows,
                error_count=error_count,
            ),
            errors=errors,
        )
