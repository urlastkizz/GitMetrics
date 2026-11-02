export interface RepositorySnapshot {
  repository: string;
  stars: number;
  forks: number;
  openIssuesAndPullRequests: number;
  openPullRequests: number;
  languageBytes: Record<string, number>;
  lastCommitAt: string | null;
}

export interface RepositoryMetrics {
  repository: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPullRequests: number;
  languages: { name: string; percentage: number }[];
  lastCommitAt: string | null;
}

export type RepositoryLoader = (
  repository: string,
  token?: string,
) => Promise<RepositorySnapshot>;
