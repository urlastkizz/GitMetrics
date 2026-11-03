import { z } from 'zod';

const httpError = z.object({
  status: z.number().optional(),
  response: z
    .object({ headers: z.record(z.string(), z.unknown()).optional() })
    .optional(),
});

export function githubError(error: unknown): Error {
  const parsed = httpError.safeParse(error);
  const status = parsed.success ? parsed.data.status : undefined;
  const headers = parsed.success ? parsed.data.response?.headers : undefined;
  if (status === 401)
    return new Error(
      'GitHub rejected the token. It may be invalid or expired. Check --token or GITHUB_TOKEN.',
    );
  if (status === 404)
    return new Error(
      'Repository not found. Check the owner/name and public access.',
    );
  if (
    status === 429 ||
    (status === 403 && headers?.['x-ratelimit-remaining'] === '0')
  ) {
    const rawReset = headers?.['x-ratelimit-reset'];
    const seconds =
      typeof rawReset === 'string' && rawReset.trim() !== ''
        ? Number(rawReset)
        : NaN;
    const reset = new Date(seconds * 1000);
    return new Error(
      Number.isFinite(reset.getTime())
        ? `GitHub rate limit reached. Resets at ${reset.toISOString()} (UTC).`
        : 'GitHub rate limit reached. Reset time unavailable.',
    );
  }
  if (status === 403)
    return new Error('GitHub access denied. Check repository permissions.');
  if (status !== undefined)
    return new Error('GitHub request failed. Please try again later.');
  return new Error(
    'Unable to connect to GitHub. Check your network connection and try again.',
  );
}
