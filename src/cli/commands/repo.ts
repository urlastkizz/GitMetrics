import type { Command } from 'commander';
import { z } from 'zod';
import { resolveToken } from '../../config/token.js';
import { calculateRepositoryMetrics } from '../../core/metrics/repo.js';
import type { RepositoryLoader } from '../../core/types.js';
import { formatRepository } from '../../output/repo.js';

const repositoryArgument = z.string().regex(/^[\w.-]+\/[\w.-]+$/);

export function registerRepoCommand(
  program: Command,
  loader: RepositoryLoader,
): void {
  const command = program
    .command('repo')
    .description('Show metrics for a public GitHub repository')
    .argument(
      '<owner/name>',
      'Repository owner and name, for example octocat/Hello-World',
    )
    .option('--json', 'Output repository metrics as JSON')
    .option('--no-color', 'Disable terminal colors')
    .option('--token <token>', 'GitHub token (overrides GITHUB_TOKEN)')
    .action(async (repository: string) => {
      if (!repositoryArgument.safeParse(repository).success) {
        command.error(
          'Expected owner/name. Example: gitmetrics repo octocat/Hello-World',
          { exitCode: 2 },
        );
        return;
      }
      const options = command.optsWithGlobals<{
        json?: boolean;
        color?: boolean;
        token?: string;
      }>();
      try {
        const snapshot = await loader(repository, resolveToken(options.token));
        const metrics = calculateRepositoryMetrics(snapshot);
        process.stdout.write(`${formatRepository(metrics, options)}\n`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load repository metrics.';
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });
}
