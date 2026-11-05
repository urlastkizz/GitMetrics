export interface PullRequestSnapshot {
  repository: string;
  pullRequests: {
    createdAt: string;
    closedAt: string;
    mergedAt: string | null;
  }[];
}

export interface PullRequestMetrics {
  repository: string;
  analyzed: number;
  merged: number;
  closedWithoutMerge: number;
  mergeRate: number;
  medianTimeToMergeSeconds: number | null;
  averageTimeToMergeSeconds: number | null;
}

export type PullRequestLoader = (
  repository: string,
  token?: string,
) => Promise<PullRequestSnapshot>;
