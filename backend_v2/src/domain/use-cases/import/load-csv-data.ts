import { EntityType } from './parse-csv';

export interface LoadResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export abstract class LoadCsvData {
  abstract execute(
    gymId: string,
    entityType: EntityType,
    rows: Record<string, unknown>[],
  ): Promise<LoadResult>;
}
