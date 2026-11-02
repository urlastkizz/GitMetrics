import type { RepositoryMetrics, RepositorySnapshot } from '../types.js';

export function calculateRepositoryMetrics(
  snapshot: RepositorySnapshot,
): RepositoryMetrics {
  const openIssues =
    snapshot.openIssuesAndPullRequests - snapshot.openPullRequests;
  if (openIssues < 0)
    throw new Error(
      'GitHub returned inconsistent issue and pull request counts. Please try again.',
    );
  const entries = Object.entries(snapshot.languageBytes);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const languages =
    total === 0
      ? []
      : entries
          .sort(
            ([a, aBytes], [b, bBytes]) =>
              bBytes - aBytes || (a < b ? -1 : a > b ? 1 : 0),
          )
          .map(([name, bytes]) => ({
            name,
            percentage: Math.round((bytes / total) * 10000) / 100,
          }));
  return {
    repository: snapshot.repository,
    stars: snapshot.stars,
    forks: snapshot.forks,
    openIssues,
    openPullRequests: snapshot.openPullRequests,
    languages,
    lastCommitAt:
      snapshot.lastCommitAt === null
        ? null
        : new Date(snapshot.lastCommitAt).toISOString(),
  };
}
