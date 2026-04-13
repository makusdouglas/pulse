export interface SeedResult {
  created: number;
  skipped: number;
  updated: number;
  errors: string[];
}

export interface ISeed {
  readonly name: string;
  readonly order: number;
  run(): Promise<SeedResult>;
}
