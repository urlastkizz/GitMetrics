import { z } from 'zod';
import type {
  ActivityPeriod,
  ActivitySnapshot,
} from '../core/activity-types.js';
import { createGitHubClient } from './client.js';
import { ActivityError, activityError } from './activity-errors.js';

const query = `query Activity($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;
const responseSchema = z.object({
  user: z
    .object({
      login: z.string().min(1),
      contributionsCollection: z.object({
        contributionCalendar: z.object({
          weeks: z.array(
            z.object({
              contributionDays: z.array(
                z.object({
                  date: z.iso.date(),
                  contributionCount: z.number().int().nonnegative(),
                }),
              ),
            }),
          ),
        }),
      }),
    })
    .nullable(),
});

export async function fetchActivity(
  user: string,
  period: ActivityPeriod,
  client = createGitHubClient(),
): Promise<ActivitySnapshot> {
  try {
    const raw: unknown = await client.graphql(query, {
      login: user,
      from: period.from,
      to: period.to,
    });
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success)
      throw new ActivityError(
        'GitHub returned invalid activity data. Please try again later.',
      );
    if (parsed.data.user === null)
      throw new ActivityError('GitHub user not found. Check the username.');
    return {
      user: parsed.data.user.login,
      contributionDays:
        parsed.data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
          (week) =>
            week.contributionDays.map((day) => ({
              date: day.date,
              count: day.contributionCount,
            })),
        ),
    };
  } catch (error) {
    if (error instanceof ActivityError) throw error;
    throw activityError(error);
  }
}
