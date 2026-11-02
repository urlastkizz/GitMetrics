import { Octokit } from '@octokit/rest';

export function createGitHubClient(
  token?: string,
  fetchImplementation?: typeof fetch,
): Octokit {
  return new Octokit({
    ...(token ? { auth: token } : {}),
    request: {
      timeout: 15000,
      ...(fetchImplementation ? { fetch: fetchImplementation } : {}),
    },
    // CLI errors are mapped centrally, so Octokit must not log raw request details.
    log: { debug() {}, info() {}, warn() {}, error() {} },
    throttle: { enabled: false },
    retry: { enabled: false },
  });
}
