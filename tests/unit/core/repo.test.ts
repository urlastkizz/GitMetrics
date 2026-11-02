import { describe, expect, it } from 'vitest';
import { calculateRepositoryMetrics } from '../../../src/core/metrics/repo.js';

const snapshot = {
  repository: 'owner/name',
  stars: 12,
  forks: 2,
  openIssuesAndPullRequests: 4,
  openPullRequests: 1,
  languageBytes: { TypeScript: 3, JavaScript: 1 },
  lastCommitAt: '2026-01-02T00:04:05-03:00',
};

describe('repository metrics', () => {
  it('excludes PRs from issues and calculates serializable UTC metrics', () => {
    expect(calculateRepositoryMetrics(snapshot)).toEqual({
      repository: 'owner/name',
      stars: 12,
      forks: 2,
      openIssues: 3,
      openPullRequests: 1,
      languages: [
        { name: 'TypeScript', percentage: 75 },
        { name: 'JavaScript', percentage: 25 },
      ],
      lastCommitAt: '2026-01-02T03:04:05.000Z',
    });
  });
  it('sorts tied languages by name and rounds to two decimals', () => {
    expect(
      calculateRepositoryMetrics({
        ...snapshot,
        languageBytes: { Z: 1, B: 1, A: 1 },
      }).languages,
    ).toEqual([
      { name: 'A', percentage: 33.33 },
      { name: 'B', percentage: 33.33 },
      { name: 'Z', percentage: 33.33 },
    ]);
  });
  it('handles empty languages and commits', () => {
    const result = calculateRepositoryMetrics({
      ...snapshot,
      languageBytes: { A: 0 },
      lastCommitAt: null,
    });
    expect(result.languages).toEqual([]);
    expect(result.lastCommitAt).toBeNull();
    expect(
      calculateRepositoryMetrics({ ...snapshot, languageBytes: {} }).languages,
    ).toEqual([]);
    expect(
      calculateRepositoryMetrics({
        ...snapshot,
        languageBytes: { A: 1, B: 1 },
      }).languages.map((language) => language.name),
    ).toEqual(['A', 'B']);
  });
  it('rejects impossible issue counts', () => {
    expect(() =>
      calculateRepositoryMetrics({ ...snapshot, openIssuesAndPullRequests: 0 }),
    ).toThrow('inconsistent');
  });
});
