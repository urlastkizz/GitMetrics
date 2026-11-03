import { githubError } from './errors.js';

export interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
}

export interface GitHubRepository {
  name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
}

async function fetchGitHub<T>(
  path: string,
  username: string,
  token?: string,
): Promise<T> {
  const response = await fetch(`https://api.github.com/users/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 401) throw githubError({ status: 401 });

  if (response.status === 404) {
    throw new Error(`GitHub user "${username}" not found.`);
  }

  if (!response.ok) {
    throw new Error(`GitHub API returned status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function fetchProfile(username: string, token?: string) {
  const userPath = encodeURIComponent(username);
  const [profile, repositories] = await Promise.all([
    fetchGitHub<GitHubProfile>(userPath, username, token),
    fetchGitHub<GitHubRepository[]>(
      `${userPath}/repos?type=owner&sort=created&direction=desc&per_page=5`,
      username,
      token,
    ),
  ]);
  return { profile, repositories };
}
