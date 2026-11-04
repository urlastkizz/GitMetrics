import type { Command } from 'commander';
import { z } from 'zod';
import { resolveToken } from '../../config/token.js';
import { calculatePullRequestMetrics } from '../../core/metrics/prs.js';
import type { PullRequestLoader } from '../../core/prs-types.js';
import { formatPullRequests } from '../../output/prs.js';

const repositoryArgument = z.string().regex(/^[\w.-]+\/[\w.-]+$/);
const limitSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(100));

export function registerPrsCommand(
  program: Command,
  loader: PullRequestLoader,
): void {
  const command = program
    .command('prs')
    .description(
      'Show pull request merge metrics for a public GitHub repository',
    )
    .argument(
      '<owner/name>',
      'Repository owner and name, for example octocat/Hello-World',
    )
    .option(
      '--limit <n>',
      'Number of closed pull requests to analyze, from 1 to 100',
      '50',
    )
    .option('--json', 'Output pull request metrics as JSON')
    .option('--no-color', 'Disable terminal colors')
    .option('--token <token>', 'GitHub token (overrides GITHUB_TOKEN)')
    .action(async (repository: string) => {
      if (!repositoryArgument.safeParse(repository).success) {
        command.error(
          'Expected owner/name. Example: gitmetrics prs octocat/Hello-World',
          { exitCode: 2 },
        );
        return;
      }
      const options = command.optsWithGlobals<{
        limit: string;
        json?: boolean;
        color?: boolean;
        token?: string;
      }>();
      const limit = limitSchema.safeParse(options.limit);
      if (!limit.success) {
        command.error('Limit must be an integer from 1 to 100.', {
          exitCode: 2,
        });
        return;
      }
      try {
        const snapshot = await loader(repository, resolveToken(options.token));
        const metrics = calculatePullRequestMetrics(snapshot, limit.data);
        process.stdout.write(`${formatPullRequests(metrics, options)}\n`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load pull request metrics.';
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });
}
