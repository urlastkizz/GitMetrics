export interface ActivityPeriod {
  days: number;
  startDate: string;
  endDate: string;
  from: string;
  to: string;
}

export interface ActivitySnapshot {
  user: string;
  contributionDays: { date: string; count: number }[];
}

export interface ActivityMetrics {
  user: string;
  days: number;
  startDate: string;
  endDate: string;
  totalContributions: number;
  activeDays: number;
  busiestDay: { date: string; count: number } | null;
}

export type ActivityLoader = (
  user: string,
  period: ActivityPeriod,
  token: string,
) => Promise<ActivitySnapshot>;
