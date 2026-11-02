import { Octokit } from '@octokit/rest';

export function createGitHubClient(
  token?: string,
  fetchImplementation?: typeof fetch,
): Octokit {
  const client = new Octokit({
    ...(token ? { auth: token } : {}),
    request: {
      ...(fetchImplementation ? { fetch: fetchImplementation } : {}),
    },
    // CLI errors are mapped centrally, so Octokit must not log raw request details.
    log: { debug() {}, info() {}, warn() {}, error() {} },
    throttle: { enabled: false },
    retry: { enabled: false },
  });
  client.hook.wrap('request', async (request, options) => {
    const controller = new AbortController();
    const externalSignal = options.request?.signal;
    const deadline = setTimeout(
      () => controller.abort(new Error('GitHub request timed out.')),
      15000,
    );
    options.request = {
      ...options.request,
      signal: externalSignal
        ? AbortSignal.any([externalSignal, controller.signal])
        : controller.signal,
    };
    try {
      return await request(options);
    } finally {
      clearTimeout(deadline);
    }
  });
  return client;
}
