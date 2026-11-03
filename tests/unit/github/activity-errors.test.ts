import { expect, it } from 'vitest';
import { activityError } from '../../../src/github/activity-errors.js';

it.each([
  [
    { status: 401, message: 'secret-placeholder' },
    'GitHub rejected the token. It may be invalid or expired. Check --token or GITHUB_TOKEN.',
  ],
  [
    { errors: [{ type: 'NOT_FOUND', message: 'secret-placeholder' }] },
    'GitHub user not found. Check the username.',
  ],
  [
    { errors: [{ type: 'FORBIDDEN' }] },
    'GitHub access denied. Check token permissions for activity.',
  ],
  [
    { errors: [{ type: 'RATE_LIMITED' }] },
    'GitHub rate limit reached. Reset time unavailable.',
  ],
  [{ status: 429 }, 'GitHub rate limit reached. Reset time unavailable.'],
  [
    { status: 403 },
    'GitHub access denied. Check token permissions for activity.',
  ],
  [
    { errors: [{ message: 'secret-placeholder' }] },
    'Unable to load GitHub activity. Please try again later.',
  ],
  [
    new Error('secret-placeholder'),
    'Unable to connect to GitHub. Check your network connection and try again.',
  ],
  [{ status: 500 }, 'Unable to load GitHub activity. Please try again later.'],
])('maps activity failures safely: %j', (error, message) => {
  expect(activityError(error).message).toBe(message);
  expect(activityError(error).message).not.toContain('secret-placeholder');
});
it('uses GraphQL rate-limit headers without inventing dates', () => {
  expect(
    activityError({
      errors: [{ type: 'RATE_LIMITED' }],
      headers: { 'x-ratelimit-reset': '1767225600' },
    }).message,
  ).toBe(
    'GitHub rate limit reached. Resets at 2026-01-01T00:00:00.000Z (UTC).',
  );
});
