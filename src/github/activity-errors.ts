import { z } from 'zod';
import { githubError } from './errors.js';

export class ActivityError extends Error {}

const errorSchema = z.object({
  status: z.number().optional(),
  errors: z.array(z.object({ type: z.string().optional() })).optional(),
  headers: z.record(z.string(), z.unknown()).optional(),
  response: z
    .object({ headers: z.record(z.string(), z.unknown()).optional() })
    .optional(),
});

export function activityError(error: unknown): ActivityError {
  const parsed = errorSchema.safeParse(error);
  const details = parsed.success ? parsed.data : {};
  const types = details.errors?.map((item) => item.type) ?? [];
  const headers = details.headers ?? details.response?.headers;
  if (details.status === 401)
    return new ActivityError(githubError(error).message);
  if (details.status === 404 || types.includes('NOT_FOUND'))
    return new ActivityError('GitHub user not found. Check the username.');
  if (
    details.status === 429 ||
    types.includes('RATE_LIMITED') ||
    (details.status === 403 && headers?.['x-ratelimit-remaining'] === '0')
  ) {
    return new ActivityError(
      githubError({ status: 429, response: { headers } }).message,
    );
  }
  if (details.status === 403 || types.includes('FORBIDDEN'))
    return new ActivityError(
      'GitHub access denied. Check token permissions for activity.',
    );
  if (details.errors || details.status !== undefined)
    return new ActivityError(
      'Unable to load GitHub activity. Please try again later.',
    );
  return new ActivityError(
    'Unable to connect to GitHub. Check your network connection and try again.',
  );
}
