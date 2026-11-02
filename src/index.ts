#!/usr/bin/env node
import { runCli } from './cli/index.js';
import { createGitHubClient } from './github/client.js';
import { fetchRepository } from './github/repo.js';

await runCli(process.argv, (repository, token) =>
  fetchRepository(repository, createGitHubClient(token)),
);
