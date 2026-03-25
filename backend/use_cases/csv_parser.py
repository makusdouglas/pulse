"""CSV parser for member, checkin, and payment imports.

Handles Brazilian date formats (dd/mm/yyyy), encoding detection,
column validation, and row-level data normalization.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import IO

# Expected CSV column names (Portuguese — user-facing files)
MEMBER_COLUMNS = {"nome", "email", "telefone", "matricula_em"}
CHECKIN_COLUMNS = {"email_aluno", "data_hora"}
PAYMENT_COLUMNS = {"email_aluno", "vencimento", "valor", "status"}

ENTITY_REQUIRED_COLUMNS: dict[str, set[str]] = {
    "members": MEMBER_COLUMNS,
    "checkins": CHECKIN_COLUMNS,
    "payments": PAYMENT_COLUMNS,
}

_DATE_FORMATS = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]
_DATETIME_FORMATS = ["%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S"]
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

MAX_ROWS = 10_000

VALID_PAYMENT_STATUSES = {"pago", "pendente", "atrasado", "cancelado"}
PAYMENT_STATUS_MAP = {
    "pago": "paid",
    "pendente": "pending",
    "atrasado": "overdue",
    "cancelado": "cancelled",
}


@dataclass
class ParseError:
    row: int
    field: str
    message: str


@dataclass
class ParseResult:
    rows: list[dict] = field(default_factory=list)
    errors: list[ParseError] = field(default_factory=list)
    total_rows: int = 0


def _decode_file(raw: bytes) -> str:
    """Decode file bytes trying utf-8-sig first, then latin-1 as fallback."""
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, ValueError):
            continue
    raise ValueError("Unable to decode CSV file. Expected UTF-8 or Latin-1 encoding.")


def _parse_date(value: str) -> date | None:
    """Try multiple date formats, return None if all fail."""
    value = value.strip()
    if not value:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _parse_datetime(value: str) -> datetime | None:
    """Try multiple datetime formats, falling back to date-only."""
    value = value.strip()
    if not value:
        return None
    for fmt in _DATETIME_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    # Fallback: try as date only (midnight)
    d = _parse_date(value)
    return datetime(d.year, d.month, d.day) if d else None


def _validate_email(value: str) -> bool:
    return bool(_EMAIL_RE.match(value.strip()))


def _clean(value: str | None) -> str:
    """Strip whitespace, return empty string for None."""
    return value.strip() if value else ""


def parse_csv(file: IO[bytes] | bytes, entity_type: str) -> ParseResult:
    """Parse a CSV file and return validated rows.

    Args:
        file: Raw bytes or file-like object containing CSV data.
        entity_type: One of 'members', 'checkins', 'payments'.

    Returns:
        ParseResult with validated rows and any per-row errors.
    """
    if entity_type not in ENTITY_REQUIRED_COLUMNS:
        raise ValueError(
            f"Invalid entity_type '{entity_type}'. "
            f"Expected one of: {', '.join(ENTITY_REQUIRED_COLUMNS)}"
        )

    raw = file if isinstance(file, bytes) else file.read()
    text = _decode_file(raw)
    reader = csv.DictReader(io.StringIO(text))

    # Validate columns
    if reader.fieldnames is None:
        raise ValueError("CSV file is empty or has no header row.")

    actual_columns = {c.strip().lower() for c in reader.fieldnames}
    required = ENTITY_REQUIRED_COLUMNS[entity_type]
    missing = required - actual_columns
    if missing:
        raise ValueError(
            f"Missing required columns for {entity_type}: {', '.join(sorted(missing))}"
        )

    parser_fn = {
        "members": _parse_member_row,
        "checkins": _parse_checkin_row,
        "payments": _parse_payment_row,
    }[entity_type]

    result = ParseResult()
    for i, raw_row in enumerate(reader, start=2):  # row 1 is header
        if result.total_rows >= MAX_ROWS:
            raise ValueError(
                f"CSV exceeds maximum of {MAX_ROWS:,} rows. "
                "Please split the file into smaller batches."
            )
        row = {k.strip().lower(): v for k, v in raw_row.items()}
        parsed, errors = parser_fn(row, i)
        result.total_rows += 1
        if errors:
            result.errors.extend(errors)
        else:
            result.rows.append(parsed)

    return result


def _parse_member_row(
    row: dict, row_num: int
) -> tuple[dict | None, list[ParseError]]:
    errors: list[ParseError] = []
    name = _clean(row.get("nome"))
    email = _clean(row.get("email"))
    phone = _clean(row.get("telefone"))
    enrolled_raw = _clean(row.get("matricula_em"))
    cancelled_raw = _clean(row.get("cancelamento_em", ""))

    if not name:
        errors.append(ParseError(row_num, "nome", "Name is required"))
    if not email:
        errors.append(ParseError(row_num, "email", "Email is required"))
    elif not _validate_email(email):
        errors.append(ParseError(row_num, "email", f"Invalid email: {email}"))

    enrolled_at = _parse_date(enrolled_raw) if enrolled_raw else None
    if enrolled_raw and enrolled_at is None:
        errors.append(
            ParseError(row_num, "matricula_em", f"Invalid date: {enrolled_raw}")
        )

    cancelled_at = None
    if cancelled_raw:
        cancelled_at = _parse_date(cancelled_raw)
        if cancelled_at is None:
            errors.append(
                ParseError(
                    row_num, "cancelamento_em", f"Invalid date: {cancelled_raw}"
                )
            )

    if errors:
        return None, errors

    status = "cancelled" if cancelled_at else "active"

    return {
        "name": name,
        "email": email.lower(),
        "phone": phone or None,
        "enrolled_at": enrolled_at,
        "cancelled_at": cancelled_at,
        "status": status,
    }, []


def _parse_checkin_row(
    row: dict, row_num: int
) -> tuple[dict | None, list[ParseError]]:
    errors: list[ParseError] = []
    email = _clean(row.get("email_aluno"))
    ts_raw = _clean(row.get("data_hora"))
    duration_raw = _clean(row.get("duracao_min", ""))

    if not email:
        errors.append(ParseError(row_num, "email_aluno", "Email is required"))
    elif not _validate_email(email):
        errors.append(ParseError(row_num, "email_aluno", f"Invalid email: {email}"))

    ts = _parse_datetime(ts_raw) if ts_raw else None
    if not ts_raw:
        errors.append(ParseError(row_num, "data_hora", "Timestamp is required"))
    elif ts is None:
        errors.append(ParseError(row_num, "data_hora", f"Invalid datetime: {ts_raw}"))

    duration_min = None
    if duration_raw:
        try:
            duration_min = int(duration_raw)
            if duration_min <= 0:
                errors.append(
                    ParseError(row_num, "duracao_min", "Duration must be > 0")
                )
        except ValueError:
            errors.append(
                ParseError(
                    row_num, "duracao_min", f"Invalid duration: {duration_raw}"
                )
            )

    if errors:
        return None, errors

    return {
        "member_email": email.lower(),
        "ts": ts,
        "duration_min": duration_min,
    }, []


def _parse_payment_row(
    row: dict, row_num: int
) -> tuple[dict | None, list[ParseError]]:
    errors: list[ParseError] = []
    email = _clean(row.get("email_aluno"))
    due_date_raw = _clean(row.get("vencimento"))
    paid_at_raw = _clean(row.get("pago_em", ""))
    amount_raw = _clean(row.get("valor"))
    status_raw = _clean(row.get("status", "")).lower()

    if not email:
        errors.append(ParseError(row_num, "email_aluno", "Email is required"))
    elif not _validate_email(email):
        errors.append(ParseError(row_num, "email_aluno", f"Invalid email: {email}"))

    due_date = _parse_date(due_date_raw) if due_date_raw else None
    if not due_date_raw:
        errors.append(ParseError(row_num, "vencimento", "Due date is required"))
    elif due_date is None:
        errors.append(
            ParseError(row_num, "vencimento", f"Invalid date: {due_date_raw}")
        )

    paid_at = None
    if paid_at_raw:
        paid_at = _parse_date(paid_at_raw)
        if paid_at is None:
            errors.append(
                ParseError(row_num, "pago_em", f"Invalid date: {paid_at_raw}")
            )

    amount = None
    if not amount_raw:
        errors.append(ParseError(row_num, "valor", "Amount is required"))
    else:
        try:
            # Handle Brazilian decimal separator (comma)
            amount = float(amount_raw.replace(",", "."))
            if amount <= 0:
                errors.append(ParseError(row_num, "valor", "Amount must be > 0"))
        except ValueError:
            errors.append(
                ParseError(row_num, "valor", f"Invalid amount: {amount_raw}")
            )

    if status_raw and status_raw not in VALID_PAYMENT_STATUSES:
        errors.append(
            ParseError(
                row_num,
                "status",
                f"Invalid status: {status_raw}. "
                f"Expected: {', '.join(sorted(VALID_PAYMENT_STATUSES))}",
            )
        )

    if errors:
        return None, errors

    return {
        "member_email": email.lower(),
        "due_date": due_date,
        "paid_at": paid_at,
        "amount": amount,
        "status": PAYMENT_STATUS_MAP.get(status_raw, "pending"),
    }, []
