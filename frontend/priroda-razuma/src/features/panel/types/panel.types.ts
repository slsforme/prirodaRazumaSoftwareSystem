export interface DailyStat {
  date: string;
  count: number;
}

export type DateRangeType = 'week' | 'month' | 'quarter' | 'year';
