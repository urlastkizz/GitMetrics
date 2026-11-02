import { z } from 'zod';
import type { RepositorySnapshot } from '../core/types.js';
import { createGitHubClient } from './client.js';
import { githubError } from './errors.js';

const count = z.number().int().nonnegative();
const metadataSchema = z.object({
  full_name: z.string().min(1),
  stargazers_count: count,
  forks_count: count,
  open_issues_count: count,
  default_branch: z.string().min(1),
});
const languagesSchema = z.record(z.string(), count);
const pullRequestsSchema = z.array(
  z.object({ number: z.number().int().positive() }),
);
const commitsSchema = z.array(
  z.object({
    commit: z.object({
      committer: z.object({ date: z.iso.datetime({ offset: true }) }),
    }),
  }),
);
const emptyRepositoryError = z.object({
  status: z.literal(409),
  response: z.object({
    data: z.object({ message: z.literal('Git Repository is empty.') }),
  }),
});

export async function fetchRepository(
  repository: string,
  client = createGitHubClient(),
): Promise<RepositorySnapshot> {
  const [owner = '', repo = ''] = repository.split('/');
  const parameters = { owner, repo };
  try {
    const metadata = metadataSchema.parse(
      (await client.rest.repos.get(parameters)).data,
    );
    const languageBytes = languagesSchema.parse(
      (await client.rest.repos.listLanguages(parameters)).data,
    );
    let openPullRequests = 0;
    for await (const page of client.paginate.iterator(client.rest.pulls.list, {
      ...parameters,
      state: 'open',
      per_page: 100,
    })) {
      openPullRequests += pullRequestsSchema.parse(page.data).length;
    }
    let lastCommitAt: string | null;
    try {
      const commits = commitsSchema.parse(
        (
          await client.rest.repos.listCommits({
            ...parameters,
            sha: metadata.default_branch,
            per_page: 1,
          })
        ).data,
      );
      lastCommitAt = commits[0]?.commit.committer.date ?? null;
    } catch (error) {
      if (!emptyRepositoryError.safeParse(error).success) throw error;
      lastCommitAt = null;
    }
    return {
      repository: metadata.full_name,
      stars: metadata.stargazers_count,
      forks: metadata.forks_count,
      openIssuesAndPullRequests: metadata.open_issues_count,
      openPullRequests,
      languageBytes,
      lastCommitAt,
    };
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        'GitHub returned invalid repository data. Please try again later.',
        { cause: error },
      );
    throw githubError(error);
  }
}
