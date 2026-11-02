export function resolveToken(
  explicit?: string,
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return explicit ?? environment.GITHUB_TOKEN;
}
