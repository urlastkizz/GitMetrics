import { Command, CommanderError } from 'commander';
import { version } from '../../package.json';
import { showProfile } from './profile.js';

export async function runCli(args: string[]): Promise<void> {
  const program = new Command();
  program
    .name('metrica')
    .description(
      'Show a GitHub profile and its five newest public repositories.',
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
