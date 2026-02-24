export type Role = 'ГДф' | 'СВ';

export interface Stats {
  averageAll: number | null;
  averageGdf: number | null;
  averageSv: number | null;
  totalVotes: number;
  countGdf: number;
  countSv: number;
}
