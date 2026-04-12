import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import {
  ParseCsv,
  ParseResult,
  ParseError,
  EntityType,
} from '../../../domain/use-cases/import/parse-csv';
import { parseDate, parseDateTime, validateEmail } from '../../helpers/date-parser';

const MEMBER_COLUMNS = new Set(['nome', 'email', 'telefone', 'matricula_em']);
const CHECKIN_COLUMNS = new Set(['email_aluno', 'data_hora']);
const PAYMENT_COLUMNS = new Set(['email_aluno', 'vencimento', 'valor', 'status']);

const ENTITY_REQUIRED_COLUMNS: Record<EntityType, Set<string>> = {
  members: MEMBER_COLUMNS,
  checkins: CHECKIN_COLUMNS,
  payments: PAYMENT_COLUMNS,
};

const VALID_PAYMENT_STATUSES = new Set([
  'pago',
  'pendente',
  'atrasado',
  'cancelado',
]);
const PAYMENT_STATUS_MAP: Record<string, string> = {
  pago: 'paid',
  pendente: 'pending',
  atrasado: 'overdue',
  cancelado: 'cancelled',
};

const MAX_ROWS = 10_000;

function decodeFile(raw: Buffer): string {
  // Try UTF-8 (handles BOM via utf-8-sig behavior)
  const text = raw.toString('utf-8');
  // Remove BOM if present
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function clean(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

@Injectable()
export class ParseCsvService implements ParseCsv {
  async execute(file: Buffer, entityType: EntityType): Promise<ParseResult> {
    if (!ENTITY_REQUIRED_COLUMNS[entityType]) {
      throw new Error(
        `Invalid entity_type '${entityType}'. Expected one of: members, checkins, payments`,
      );
    }

    const text = decodeFile(file);

    const records: Record<string, string>[] = parse(text, {
      columns: (header: string[]) =>
        header.map((h: string) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      relaxColumnCount: true,
    });

    // Validate columns
    if (records.length === 0) {
      throw new Error('CSV file is empty or has no data rows.');
    }

    const actualColumns = new Set(Object.keys(records[0]));
    const required = ENTITY_REQUIRED_COLUMNS[entityType];
    const missing = [...required].filter((c) => !actualColumns.has(c));
    if (missing.length > 0) {
      throw new Error(
        `Missing required columns for ${entityType}: ${missing.sort().join(', ')}`,
      );
    }

    const parserFn =
      entityType === 'members'
        ? this.parseMemberRow
        : entityType === 'checkins'
          ? this.parseCheckinRow
          : this.parsePaymentRow;

    const result: ParseResult = { rows: [], errors: [], totalRows: 0 };

    for (let i = 0; i < records.length; i++) {
      if (result.totalRows >= MAX_ROWS) {
        throw new Error(
          `CSV exceeds maximum of ${MAX_ROWS.toLocaleString()} rows. Please split the file into smaller batches.`,
        );
      }
      const rowNum = i + 2; // row 1 is header
      const { parsed, errors } = parserFn(records[i], rowNum);
      result.totalRows++;
      if (errors.length > 0) {
        result.errors.push(...errors);
      } else if (parsed) {
        result.rows.push(parsed);
      }
    }

    return result;
  }

  private parseMemberRow(
    row: Record<string, string>,
    rowNum: number,
  ): { parsed: Record<string, unknown> | null; errors: ParseError[] } {
    const errors: ParseError[] = [];
    const name = clean(row['nome']);
    const email = clean(row['email']);
    const phone = clean(row['telefone']);
    const enrolledRaw = clean(row['matricula_em']);
    const cancelledRaw = clean(row['cancelamento_em']);

    if (!name) errors.push({ row: rowNum, field: 'nome', message: 'Name is required' });
    if (!email) {
      errors.push({ row: rowNum, field: 'email', message: 'Email is required' });
    } else if (!validateEmail(email)) {
      errors.push({ row: rowNum, field: 'email', message: `Invalid email: ${email}` });
    }

    const enrolledAt = enrolledRaw ? parseDate(enrolledRaw) : null;
    if (enrolledRaw && !enrolledAt) {
      errors.push({ row: rowNum, field: 'matricula_em', message: `Invalid date: ${enrolledRaw}` });
    }

    let cancelledAt: Date | null = null;
    if (cancelledRaw) {
      cancelledAt = parseDate(cancelledRaw);
      if (!cancelledAt) {
        errors.push({ row: rowNum, field: 'cancelamento_em', message: `Invalid date: ${cancelledRaw}` });
      }
    }

    if (errors.length > 0) return { parsed: null, errors };

    return {
      parsed: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        enrolled_at: enrolledAt,
        cancelled_at: cancelledAt,
        status: cancelledAt ? 'cancelled' : 'active',
      },
      errors: [],
    };
  }

  private parseCheckinRow(
    row: Record<string, string>,
    rowNum: number,
  ): { parsed: Record<string, unknown> | null; errors: ParseError[] } {
    const errors: ParseError[] = [];
    const email = clean(row['email_aluno']);
    const tsRaw = clean(row['data_hora']);
    const durationRaw = clean(row['duracao_min']);

    if (!email) {
      errors.push({ row: rowNum, field: 'email_aluno', message: 'Email is required' });
    } else if (!validateEmail(email)) {
      errors.push({ row: rowNum, field: 'email_aluno', message: `Invalid email: ${email}` });
    }

    let ts: Date | null = null;
    if (!tsRaw) {
      errors.push({ row: rowNum, field: 'data_hora', message: 'Timestamp is required' });
    } else {
      ts = parseDateTime(tsRaw);
      if (!ts) {
        errors.push({ row: rowNum, field: 'data_hora', message: `Invalid datetime: ${tsRaw}` });
      }
    }

    let durationMin: number | null = null;
    if (durationRaw) {
      const parsed = parseInt(durationRaw, 10);
      if (isNaN(parsed)) {
        errors.push({ row: rowNum, field: 'duracao_min', message: `Invalid duration: ${durationRaw}` });
      } else if (parsed <= 0) {
        errors.push({ row: rowNum, field: 'duracao_min', message: 'Duration must be > 0' });
      } else {
        durationMin = parsed;
      }
    }

    if (errors.length > 0) return { parsed: null, errors };

    return {
      parsed: {
        member_email: email.toLowerCase(),
        ts,
        duration_min: durationMin,
      },
      errors: [],
    };
  }

  private parsePaymentRow(
    row: Record<string, string>,
    rowNum: number,
  ): { parsed: Record<string, unknown> | null; errors: ParseError[] } {
    const errors: ParseError[] = [];
    const email = clean(row['email_aluno']);
    const dueDateRaw = clean(row['vencimento']);
    const paidAtRaw = clean(row['pago_em']);
    const amountRaw = clean(row['valor']);
    const statusRaw = clean(row['status']).toLowerCase();

    if (!email) {
      errors.push({ row: rowNum, field: 'email_aluno', message: 'Email is required' });
    } else if (!validateEmail(email)) {
      errors.push({ row: rowNum, field: 'email_aluno', message: `Invalid email: ${email}` });
    }

    let dueDate: Date | null = null;
    if (!dueDateRaw) {
      errors.push({ row: rowNum, field: 'vencimento', message: 'Due date is required' });
    } else {
      dueDate = parseDate(dueDateRaw);
      if (!dueDate) {
        errors.push({ row: rowNum, field: 'vencimento', message: `Invalid date: ${dueDateRaw}` });
      }
    }

    let paidAt: Date | null = null;
    if (paidAtRaw) {
      paidAt = parseDate(paidAtRaw);
      if (!paidAt) {
        errors.push({ row: rowNum, field: 'pago_em', message: `Invalid date: ${paidAtRaw}` });
      }
    }

    let amount: number | null = null;
    if (!amountRaw) {
      errors.push({ row: rowNum, field: 'valor', message: 'Amount is required' });
    } else {
      amount = parseFloat(amountRaw.replace(',', '.'));
      if (isNaN(amount)) {
        errors.push({ row: rowNum, field: 'valor', message: `Invalid amount: ${amountRaw}` });
      } else if (amount <= 0) {
        errors.push({ row: rowNum, field: 'valor', message: 'Amount must be > 0' });
      }
    }

    if (statusRaw && !VALID_PAYMENT_STATUSES.has(statusRaw)) {
      errors.push({
        row: rowNum,
        field: 'status',
        message: `Invalid status: ${statusRaw}. Expected: ${[...VALID_PAYMENT_STATUSES].sort().join(', ')}`,
      });
    }

    if (errors.length > 0) return { parsed: null, errors };

    return {
      parsed: {
        member_email: email.toLowerCase(),
        due_date: dueDate,
        paid_at: paidAt,
        amount,
        status: PAYMENT_STATUS_MAP[statusRaw] ?? 'pending',
      },
      errors: [],
    };
  }
}
