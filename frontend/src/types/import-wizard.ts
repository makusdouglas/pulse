import type { ImportError } from "./upload";

export interface ParsedMember {
  name: string;
  email: string;
  phone: string | null;
  enrolled_at: string | null;
  cancelled_at: string | null;
  status: string;
  exists: boolean;
}

export interface ParsedPayment {
  member_email: string;
  due_date: string;
  paid_at: string | null;
  amount: number;
  status: string;
}

export interface ParsedCheckin {
  member_email: string;
  ts: string;
  duration_min: number | null;
}

export interface PreviewResponse<T = Record<string, unknown>> {
  entity_type: "members" | "checkins" | "payments";
  rows: T[];
  errors: ImportError[];
  total_rows: number;
}

export type MemberCommitRow = Omit<ParsedMember, "exists">;

export interface CommitRequest {
  members: MemberCommitRow[];
  payments: ParsedPayment[];
  checkins: ParsedCheckin[];
}

export interface EntityStats {
  inserted: number;
  updated: number;
  skipped: number;
  total_rows: number;
  error_count: number;
}

export interface CommitResponse {
  status: "ok" | "partial" | "error";
  members: EntityStats;
  payments: EntityStats;
  checkins: EntityStats;
  errors: ImportError[];
}

export interface WizardState {
  members: ParsedMember[];
  excludedEmails: Set<string>;
  payments: ParsedPayment[];
  checkins: ParsedCheckin[];
  memberFileName: string | null;
  paymentFileName: string | null;
  checkinFileName: string | null;
}
