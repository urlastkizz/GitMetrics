import pc from "picocolors";
import Table from "cli-table3";

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

const numberFormat = new Intl.NumberFormat("pt-BR");

async function fetchGitHub<T>(path: string, username: string): Promise<T> {
  const response = await fetch(`https://api.github.com/users/${path}`, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) {
    throw new Error(`Usuário "${username}" não encontrado no GitHub.`);
  }

  if (!response.ok) {
    throw new Error(`A API do GitHub retornou o status ${response.status}.`);
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
    [{ colSpan: 2, content: pc.bold(pc.cyan(`PERFIL DO GITHUB · @${profile.login}`)) }],
    [pc.cyan("Nome"), pc.bold(profile.name ?? profile.login)],
    [pc.cyan("Bio"), profile.bio ?? pc.dim("Não informada")],
    [pc.cyan("Seguidores"), pc.green(numberFormat.format(profile.followers))],
    [pc.cyan("Repositórios Públicos"), numberFormat.format(profile.public_repos)],
  );

  console.log(`\n${card.toString()}\n`);
}

function displayRepositories(repositories: GitHubRepository[]): void {
  console.log(pc.bold(pc.cyan("REPOSITÓRIOS MAIS RECENTES · por data de criação")));

  if (repositories.length === 0) {
    console.log(pc.dim("Nenhum repositório público encontrado.\n"));
    return;
  }

  const width = Math.max(80, Math.min(process.stdout.columns || 120, 140));
  const table = new Table({
    head: ["Nome", "Linguagem\nPrincipal", "Estrelas", "Forks", "Link"].map(
      (label) => pc.bold(pc.cyan(label)),
    ),
    colWidths: [20, 20, 10, 8, width - 64],
    colAligns: ["left", "left", "right", "right", "left"],
    wordWrap: true,
    wrapOnWordBoundary: false,
    style: { head: [], border: [] },
  });

  for (const repository of repositories) {
    table.push([
      pc.bold(repository.name),
      repository.language ?? pc.dim("Não informada"),
      pc.yellow(numberFormat.format(repository.stargazers_count)),
      numberFormat.format(repository.forks_count),
      pc.blue(repository.html_url),
    ]);
  }

  console.log(`${table.toString()}\n`);
}

async function main(): Promise<void> {
  const username = process.argv[2]?.trim();

  if (!username) {
    console.error("Informe um usuário do GitHub. Exemplo: npm start -- octocat");
    process.exitCode = 1;
    return;
  }

  try {
    const userPath = encodeURIComponent(username);
    const [profile, repositories] = await Promise.all([
      fetchGitHub<GitHubProfile>(userPath, username),
      fetchGitHub<GitHubRepository[]>(
        `${userPath}/repos?type=owner&sort=created&direction=desc&per_page=5`,
        username,
      ),
    ]);

    displayProfile(profile);
    displayRepositories(repositories);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error(pc.red(`Erro ao consultar o GitHub: ${message}`));
    process.exitCode = 1;
  }
}

void main();
