import pc from 'picocolors';
import Table from 'cli-table3';

interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
}

interface GitHubRepository {
  name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
}

const numberFormat = new Intl.NumberFormat('en-US');

async function fetchGitHub<T>(path: string, username: string): Promise<T> {
  const response = await fetch(`https://api.github.com/users/${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) {
    throw new Error(`GitHub user "${username}" not found.`);
  }

  if (!response.ok) {
    throw new Error(`GitHub API returned status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function displayProfile(profile: GitHubProfile): void {
  const width = Math.min(process.stdout.columns || 100, 100);
  const card = new Table({
    colWidths: [24, Math.max(24, width - 27)],
    wordWrap: true,
    style: { head: [], border: [] },
  });

  card.push(
    [
      {
        colSpan: 2,
        content: pc.bold(pc.cyan(`GITHUB PROFILE · @${profile.login}`)),
      },
    ],
    [pc.cyan('Name'), pc.bold(profile.name ?? profile.login)],
    [pc.cyan('Bio'), profile.bio ?? pc.dim('Not provided')],
    [pc.cyan('Followers'), pc.green(numberFormat.format(profile.followers))],
    [pc.cyan('Public repositories'), numberFormat.format(profile.public_repos)],
  );

  console.log(`\n${card.toString()}\n`);
}

function displayRepositories(repositories: GitHubRepository[]): void {
  console.log(pc.bold(pc.cyan('LATEST REPOSITORIES · by creation date')));

  if (repositories.length === 0) {
    console.log(pc.dim('No public repositories found.\n'));
    return;
  }

  const width = Math.max(80, Math.min(process.stdout.columns || 120, 140));
  const table = new Table({
    head: ['Name', 'Primary\nlanguage', 'Stars', 'Forks', 'Link'].map((label) =>
      pc.bold(pc.cyan(label)),
    ),
    colWidths: [20, 20, 10, 8, width - 64],
    colAligns: ['left', 'left', 'right', 'right', 'left'],
    wordWrap: true,
    wrapOnWordBoundary: false,
    style: { head: [], border: [] },
  });

  for (const repository of repositories) {
    table.push([
      pc.bold(repository.name),
      repository.language ?? pc.dim('Not provided'),
      pc.yellow(numberFormat.format(repository.stargazers_count)),
      numberFormat.format(repository.forks_count),
      pc.blue(repository.html_url),
    ]);
  }

  console.log(`${table.toString()}\n`);
}

export async function showProfile(
  username: string,
  json: boolean,
): Promise<void> {
  try {
    const userPath = encodeURIComponent(username);
    const [profile, repositories] = await Promise.all([
      fetchGitHub<GitHubProfile>(userPath, username),
      fetchGitHub<GitHubRepository[]>(
        `${userPath}/repos?type=owner&sort=created&direction=desc&per_page=5`,
        username,
      ),
    ]);

    if (json) {
      process.stdout.write(`${JSON.stringify({ profile, repositories })}\n`);
    } else {
      displayProfile(profile);
      displayRepositories(repositories);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    console.error(pc.red(`Error querying GitHub: ${message}`));
    process.exitCode = 1;
  }
}
