export interface ImportStats {
  inserted: number;
  updated: number;
  skipped: number;
  total_rows: number;
  error_count: number;
}

export interface ImportError {
  row: number | null;
  field: string | null;
  message: string;
}

export interface ImportResponse {
  status: "ok" | "partial" | "error";
  entity_type: "members" | "checkins" | "payments";
  stats: ImportStats;
  errors: ImportError[];
}
