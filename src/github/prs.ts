import { z } from 'zod';
import type { PullRequestSnapshot } from '../core/prs-types.js';
import { createGitHubClient } from './client.js';
import { githubError } from './errors.js';

const date = z.iso.datetime({ offset: true });
const pullRequestsSchema = z.array(
  z.object({
    created_at: date,
    closed_at: date,
    merged_at: date.nullable(),
  }),
);

export async function fetchPullRequests(
  repository: string,
  client = createGitHubClient(),
): Promise<PullRequestSnapshot> {
  const [owner = '', repo = ''] = repository.split('/');
  try {
    // A single bounded page intentionally provides an approximate closure window.
    const response = await client.rest.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });
    return {
      repository,
      pullRequests: pullRequestsSchema.parse(response.data).map((pr) => ({
        createdAt: pr.created_at,
        closedAt: pr.closed_at,
        mergedAt: pr.merged_at,
      })),
    };
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        'GitHub returned invalid pull request data. Please try again later.',
        { cause: error },
      );
    throw githubError(error);
  }
}
