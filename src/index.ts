#!/usr/bin/env node
import { runCli } from './cli/index.js';
import { createGitHubClient } from './github/client.js';
import { fetchRepository } from './github/repo.js';
import { fetchActivity } from './github/activity.js';
import { fetchPullRequests } from './github/prs.js';

await runCli(
  process.argv,
  (repository, token) => fetchRepository(repository, createGitHubClient(token)),
  (user, period, token) =>
    fetchActivity(user, period, createGitHubClient(token)),
  (repository, token) =>
    fetchPullRequests(repository, createGitHubClient(token)),
);
