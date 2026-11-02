import { Command, CommanderError } from 'commander';
import { version } from '../../package.json';
import { showProfile } from './profile.js';
import { registerRepoCommand } from './commands/repo.js';
import type { RepositoryLoader } from '../core/types.js';
import { registerActivityCommand } from './commands/activity.js';
import type { ActivityLoader } from '../core/activity-types.js';

export async function runCli(
  args: string[],
  repositoryLoader: RepositoryLoader = async () => {
    throw new Error('Repository loader is unavailable.');
  },
  activityLoader: ActivityLoader = async () => {
    throw new Error('Activity loader is unavailable.');
  },
): Promise<void> {
  const program = new Command();
  program
    .name('metrica')
    .description(
      'Show GitHub profiles and public repository metrics (gitmetrics or metrica).',
    )
    .version(version)
    .argument('[username]', 'GitHub username without @ or a URL')
    .option('--json', 'Output profile and repositories as JSON')
    .exitOverride()
    .action(
      async (username: string | undefined, options: { json?: boolean }) => {
        const trimmed = username?.trim();
        if (!trimmed) {
          program.error('Provide a GitHub username. Example: metrica octocat', {
            exitCode: 2,
          });
          return;
        }
        await showProfile(trimmed, options.json ?? false);
      },
    );
  registerRepoCommand(program, repositoryLoader);
  registerActivityCommand(program, activityLoader);

  try {
    await program.parseAsync(args);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode === 0 ? 0 : 2;
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error.';
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  }
}
