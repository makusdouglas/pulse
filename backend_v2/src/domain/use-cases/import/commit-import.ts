import { LoadResult } from './load-csv-data';

export interface CommitRequest {
  members: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  checkins: Record<string, unknown>[];
}

export interface CommitResponse {
  status: 'ok' | 'partial' | 'error';
  membersStats: LoadResult | null;
  paymentsStats: LoadResult | null;
  checkinsStats: LoadResult | null;
  errors: string[];
}

export abstract class CommitImport {
  abstract execute(
    gymId: string,
    data: CommitRequest,
  ): Promise<CommitResponse>;
}
