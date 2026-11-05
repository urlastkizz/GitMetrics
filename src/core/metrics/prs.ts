import type { PullRequestMetrics, PullRequestSnapshot } from '../prs-types.js';

export function calculatePullRequestMetrics(
  snapshot: PullRequestSnapshot,
  limit: number,
): PullRequestMetrics {
  const selected = [...snapshot.pullRequests]
    .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))
    .slice(0, limit);
  const durations = selected
    .filter((pr) => pr.mergedAt !== null)
    .map((pr) => (Date.parse(pr.mergedAt!) - Date.parse(pr.createdAt)) / 1000)
    .sort((a, b) => a - b);
  const analyzed = selected.length;
  const merged = durations.length;
  const middle = Math.floor(merged / 2);
  const median =
    merged === 0
      ? null
      : merged % 2 === 1
        ? durations[middle]!
        : (durations[middle - 1]! + durations[middle]!) / 2;
  return {
    repository: snapshot.repository,
    analyzed,
    merged,
    closedWithoutMerge: analyzed - merged,
    mergeRate: analyzed === 0 ? 0 : (merged / analyzed) * 100,
    medianTimeToMergeSeconds: median,
    averageTimeToMergeSeconds:
      merged === 0
        ? null
        : durations.reduce((sum, duration) => sum + duration, 0) / merged,
  };
}
