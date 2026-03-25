"""Tests for use_cases/csv_parser.py — CSV parsing and validation."""

from datetime import date, datetime

import pytest

from use_cases.csv_parser import ParseError, ParseResult, parse_csv


# ---------------------------------------------------------------------------
# Helper to build CSV bytes
# ---------------------------------------------------------------------------
def _csv_bytes(header: str, *rows: str, encoding: str = "utf-8") -> bytes:
    lines = [header] + list(rows)
    return "\n".join(lines).encode(encoding)


# ===================================================================
# Members parsing
# ===================================================================


class TestParseMembersValid:
    def test_basic_member(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao Silva,joao@email.com,11999887766,15/03/2024,",
        )
        result = parse_csv(raw, "members")

        assert result.total_rows == 1
        assert len(result.rows) == 1
        assert result.errors == []

        row = result.rows[0]
        assert row["name"] == "Joao Silva"
        assert row["email"] == "joao@email.com"
        assert row["phone"] == "11999887766"
        assert row["enrolled_at"] == date(2024, 3, 15)
        assert row["cancelled_at"] is None
        assert row["status"] == "active"

    def test_cancelled_member(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Maria Santos,maria@email.com,11988776655,10/01/2024,20/12/2024",
        )
        result = parse_csv(raw, "members")

        row = result.rows[0]
        assert row["cancelled_at"] == date(2024, 12, 20)
        assert row["status"] == "cancelled"

    def test_multiple_members(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,joao@email.com,111,15/03/2024,",
            "Maria,maria@email.com,222,10/01/2024,20/12/2024",
        )
        result = parse_csv(raw, "members")

        assert result.total_rows == 2
        assert len(result.rows) == 2
        assert result.rows[0]["status"] == "active"
        assert result.rows[1]["status"] == "cancelled"

    def test_iso_date_format(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Ana,ana@email.com,,2024-03-15,",
        )
        result = parse_csv(raw, "members")
        assert result.rows[0]["enrolled_at"] == date(2024, 3, 15)

    def test_dash_date_format(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Ana,ana@email.com,,15-03-2024,",
        )
        result = parse_csv(raw, "members")
        assert result.rows[0]["enrolled_at"] == date(2024, 3, 15)

    def test_email_lowercased(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Ana,Ana.Costa@Email.COM,,15/03/2024,",
        )
        result = parse_csv(raw, "members")
        assert result.rows[0]["email"] == "ana.costa@email.com"

    def test_phone_optional(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Ana,ana@email.com,,15/03/2024,",
        )
        result = parse_csv(raw, "members")
        assert result.rows[0]["phone"] is None


class TestParseMembersErrors:
    def test_missing_name(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            ",joao@email.com,111,15/03/2024,",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 0
        assert len(result.errors) == 1
        assert result.errors[0].field == "nome"

    def test_missing_email(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,,111,15/03/2024,",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 0
        assert result.errors[0].field == "email"

    def test_invalid_email(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,not-an-email,111,15/03/2024,",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 0
        assert result.errors[0].field == "email"
        assert "Invalid email" in result.errors[0].message

    def test_invalid_enrolled_date(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,joao@email.com,111,99/99/9999,",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 0
        assert result.errors[0].field == "matricula_em"

    def test_invalid_cancelled_date(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,joao@email.com,111,15/03/2024,bad-date",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 0
        assert result.errors[0].field == "cancelamento_em"


# ===================================================================
# Checkins parsing
# ===================================================================


class TestParseCheckinsValid:
    def test_basic_checkin(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30,65",
        )
        result = parse_csv(raw, "checkins")

        assert result.total_rows == 1
        assert len(result.rows) == 1
        row = result.rows[0]
        assert row["member_email"] == "joao@email.com"
        assert row["ts"] == datetime(2024, 3, 15, 8, 30)
        assert row["duration_min"] == 65

    def test_duration_optional(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30,",
        )
        result = parse_csv(raw, "checkins")
        assert result.rows[0]["duration_min"] is None

    def test_date_only_fallback(self):
        """Datetime parser falls back to date-only (midnight)."""
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024,60",
        )
        result = parse_csv(raw, "checkins")
        assert result.rows[0]["ts"] == datetime(2024, 3, 15, 0, 0)

    def test_datetime_with_seconds(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30:45,60",
        )
        result = parse_csv(raw, "checkins")
        assert result.rows[0]["ts"] == datetime(2024, 3, 15, 8, 30, 45)


class TestParseCheckinsErrors:
    def test_missing_email(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            ",15/03/2024 08:30,65",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "email_aluno"

    def test_invalid_email(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "bad-email,15/03/2024 08:30,65",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "email_aluno"

    def test_missing_datetime(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,,65",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "data_hora"

    def test_invalid_datetime(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,not-a-date,65",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "data_hora"

    def test_duration_zero(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30,0",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "duracao_min"
        assert "must be > 0" in result.errors[0].message

    def test_duration_negative(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30,-5",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "duracao_min"

    def test_duration_non_numeric(self):
        raw = _csv_bytes(
            "email_aluno,data_hora,duracao_min",
            "joao@email.com,15/03/2024 08:30,abc",
        )
        result = parse_csv(raw, "checkins")
        assert result.errors[0].field == "duracao_min"


# ===================================================================
# Payments parsing
# ===================================================================


class TestParsePaymentsValid:
    def test_basic_payment_paid(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,08/04/2024,149.90,pago",
        )
        result = parse_csv(raw, "payments")

        assert result.total_rows == 1
        row = result.rows[0]
        assert row["member_email"] == "joao@email.com"
        assert row["due_date"] == date(2024, 4, 10)
        assert row["paid_at"] == date(2024, 4, 8)
        assert row["amount"] == 149.90
        assert row["status"] == "paid"

    def test_payment_pending(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "maria@email.com,10/04/2024,,149.90,pendente",
        )
        result = parse_csv(raw, "payments")

        row = result.rows[0]
        assert row["paid_at"] is None
        assert row["status"] == "pending"

    def test_comma_decimal_separator(self):
        """Brazilian decimal separator (comma) is handled."""
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            'joao@email.com,10/04/2024,08/04/2024,"149,90",pago',
        )
        result = parse_csv(raw, "payments")
        assert result.rows[0]["amount"] == 149.90

    def test_status_mapping_atrasado(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,149.90,atrasado",
        )
        result = parse_csv(raw, "payments")
        assert result.rows[0]["status"] == "overdue"

    def test_status_mapping_cancelado(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,149.90,cancelado",
        )
        result = parse_csv(raw, "payments")
        assert result.rows[0]["status"] == "cancelled"

    def test_empty_status_defaults_to_pending(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,149.90,",
        )
        result = parse_csv(raw, "payments")
        assert result.rows[0]["status"] == "pending"


class TestParsePaymentsErrors:
    def test_missing_email(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            ",10/04/2024,,149.90,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "email_aluno"

    def test_missing_due_date(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,,,149.90,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "vencimento"

    def test_invalid_due_date(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,bad-date,,149.90,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "vencimento"

    def test_invalid_paid_at_date(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,nope,149.90,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "pago_em"

    def test_missing_amount(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "valor"

    def test_amount_zero(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,0,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "valor"
        assert "must be > 0" in result.errors[0].message

    def test_amount_negative(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,-50,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "valor"

    def test_amount_non_numeric(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,abc,pago",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "valor"

    def test_invalid_payment_status(self):
        raw = _csv_bytes(
            "email_aluno,vencimento,pago_em,valor,status",
            "joao@email.com,10/04/2024,,149.90,invalido",
        )
        result = parse_csv(raw, "payments")
        assert result.errors[0].field == "status"
        assert "Invalid status" in result.errors[0].message


# ===================================================================
# General / structural tests
# ===================================================================


class TestParseCSVStructural:
    def test_invalid_entity_type(self):
        raw = _csv_bytes("col1,col2", "a,b")
        with pytest.raises(ValueError, match="Invalid entity_type"):
            parse_csv(raw, "unknown")

    def test_empty_csv(self):
        raw = b""
        with pytest.raises(ValueError, match="empty or has no header"):
            parse_csv(raw, "members")

    def test_missing_required_columns(self):
        raw = _csv_bytes("nome,email", "Joao,joao@email.com")
        with pytest.raises(ValueError, match="Missing required columns"):
            parse_csv(raw, "members")

    def test_extra_columns_ignored(self):
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em,extra_col",
            "Joao,joao@email.com,111,15/03/2024,,foo",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 1
        assert "extra_col" not in result.rows[0]

    def test_utf8_bom_handled(self):
        """UTF-8 BOM (byte order mark) is stripped correctly."""
        content = "nome,email,telefone,matricula_em,cancelamento_em\nJoao,joao@email.com,111,15/03/2024,"
        raw = b"\xef\xbb\xbf" + content.encode("utf-8")
        result = parse_csv(raw, "members")
        assert len(result.rows) == 1
        assert result.rows[0]["name"] == "Joao"

    def test_latin1_encoding_fallback(self):
        """Accented characters in Latin-1 are decoded correctly."""
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "José André,jose@email.com,111,15/03/2024,",
            encoding="latin-1",
        )
        result = parse_csv(raw, "members")
        assert len(result.rows) == 1
        assert result.rows[0]["name"] == "José André"

    def test_mixed_valid_and_invalid_rows(self):
        """Valid rows are kept, invalid rows generate errors."""
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,joao@email.com,111,15/03/2024,",
            ",bad-email,,99/99/9999,",
            "Maria,maria@email.com,222,10/01/2024,",
        )
        result = parse_csv(raw, "members")
        assert result.total_rows == 3
        assert len(result.rows) == 2
        assert len(result.errors) > 0

    def test_row_numbers_in_errors(self):
        """Error row numbers are 1-indexed (header=1, first data=2)."""
        raw = _csv_bytes(
            "nome,email,telefone,matricula_em,cancelamento_em",
            "Joao,joao@email.com,111,15/03/2024,",
            ",missing@email.com,111,15/03/2024,",
        )
        result = parse_csv(raw, "members")
        assert result.errors[0].row == 3  # third line = row 3

    def test_whitespace_in_columns_stripped(self):
        """Column names with extra whitespace are normalized."""
        raw = " nome , email , telefone , matricula_em , cancelamento_em \nJoao,joao@email.com,111,15/03/2024,"
        result = parse_csv(raw.encode(), "members")
        assert len(result.rows) == 1
