export interface Checkin {
  id: string;
  memberId: string;
  gymId: string;
  ts: Date;
  durationMin: number | null;
}
