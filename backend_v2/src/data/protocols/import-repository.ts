export interface BulkUpsertMembersResult {
  inserted: number;
  updated: number;
}

export abstract class ImportRepository {
  abstract bulkUpsertMembers(
    gymId: string,
    rows: Record<string, unknown>[],
  ): Promise<BulkUpsertMembersResult>;

  abstract bulkInsertCheckins(
    gymId: string,
    rows: Record<string, unknown>[],
  ): Promise<number>;

  abstract bulkInsertPayments(
    gymId: string,
    rows: Record<string, unknown>[],
  ): Promise<number>;

  abstract resolveEmailToMemberId(
    gymId: string,
    emails: string[],
  ): Promise<Map<string, string>>;
}
