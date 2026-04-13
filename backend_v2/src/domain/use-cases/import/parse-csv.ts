export interface ParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  rows: Record<string, unknown>[];
  errors: ParseError[];
  totalRows: number;
}

export type EntityType = 'members' | 'checkins' | 'payments';

export abstract class ParseCsv {
  abstract execute(file: Buffer, entityType: EntityType): Promise<ParseResult>;
}
