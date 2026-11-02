import { expect, it } from 'vitest';
import { resolveToken } from '../../../src/config/token.js';

it('prefers an explicit token and otherwise allows environment or anonymous access', () => {
  expect(resolveToken('explicit', { GITHUB_TOKEN: 'environment' })).toBe(
    'explicit',
  );
  expect(resolveToken(undefined, { GITHUB_TOKEN: 'environment' })).toBe(
    'environment',
  );
  expect(resolveToken(undefined, {})).toBeUndefined();
});
