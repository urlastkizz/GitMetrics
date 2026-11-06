import type { Command } from 'commander';
import { z } from 'zod';
import { resolveToken } from '../../config/token.js';
import { createActivityPeriod } from '../../core/activity-period.js';
import type { ActivityLoader } from '../../core/activity-types.js';
import { calculateActivityMetrics } from '../../core/metrics/activity.js';
import { formatActivity } from '../../output/activity.js';

const usernameSchema = z
  .string()
  .max(39)
  .regex(/^[a-z\d]+(?:-[a-z\d]+)*$/i);
const daysSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(365));

export function registerActivityCommand(
  program: Command,
  loader: ActivityLoader,
): void {
  const command = program
    .command('activity')
    .description(
      'Show recent GitHub contribution activity in UTC (requires a token)',
    )
    .argument('<user>', 'GitHub username without @ or a URL')
    .option('--days <n>', 'Number of UTC calendar days, from 1 to 365', '30')
    .option('--json', 'Output activity metrics as JSON')
    .option('--no-color', 'Disable terminal colors')
    .option('--token <token>', 'GitHub token (overrides GITHUB_TOKEN)')
    .action(async (user: string) => {
      if (!usernameSchema.safeParse(user).success) {
        command.error('Expected a GitHub username without @ or a URL.', {
          exitCode: 2,
        });
        return;
      }
      const options = command.optsWithGlobals<{
        days: string;
        json?: boolean;
        color?: boolean;
        token?: string;
      }>();
      const parsedDays = daysSchema.safeParse(options.days);
      if (!parsedDays.success) {
        command.error('Days must be an integer from 1 to 365.', {
          exitCode: 2,
        });
        return;
      }
      const token = resolveToken(options.token);
      if (!token?.trim()) {
        process.stderr.write(
          'Error: Activity requires a GitHub token.\n' +
            "PowerShell: $env:GITHUB_TOKEN = 'YOUR_TOKEN'\n" +
            "bash/zsh: export GITHUB_TOKEN='YOUR_TOKEN'\n" +
            'See https://github.com/urlastkizz/GitMetrics#authentication\n',
        );
        process.exitCode = 1;
        return;
      }
      const now = new Date();
      const period = createActivityPeriod(now, parsedDays.data);
      const streakWindow = createActivityPeriod(now, 365);
      try {
        const snapshot = await loader(user, streakWindow, token);
        const metrics = calculateActivityMetrics(snapshot, period);
        process.stdout.write(`${formatActivity(metrics, options)}\n`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load GitHub activity.';
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });
}
