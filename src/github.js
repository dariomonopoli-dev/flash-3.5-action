// SPDX-License-Identifier: Apache-2.0
import { mkdir, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';
import { getOctokit } from '@actions/github';

const CHECK_SUMMARY_LIMIT = 65_000;
const TRUNCATION_SUFFIX = '\n\n(truncated)';

export function parseRepo(repository) {
  if (!repository || typeof repository !== 'string') {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY format, expected owner/repo: ${repository}`);
  }
  return { owner, repo };
}

export async function postPrComment({ token, owner, repo, prNumber, body }) {
  const octokit = getOctokit(token);
  return octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: Number(prNumber),
    body,
  });
}

export async function postIssueComment({ token, owner, repo, issueNumber, body }) {
  const octokit = getOctokit(token);
  return octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: Number(issueNumber),
    body,
  });
}

export async function createCheckRun({
  token,
  owner,
  repo,
  sha,
  name,
  conclusion,
  summary,
}) {
  const octokit = getOctokit(token);
  const truncated =
    summary && summary.length > CHECK_SUMMARY_LIMIT
      ? summary.slice(0, CHECK_SUMMARY_LIMIT - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX
      : summary || '';
  return octokit.rest.checks.create({
    owner,
    repo,
    name: name || 'flash-3.5-action',
    head_sha: sha,
    status: 'completed',
    conclusion: conclusion || 'neutral',
    output: {
      title: name || 'flash-3.5-action',
      summary: truncated,
    },
  });
}

export async function writeFile({ path: filePath, content }) {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  await mkdir(dir, { recursive: true });
  await fsWriteFile(resolved, content, 'utf8');
  return resolved;
}

export async function applyLabels({ token, owner, repo, issueNumber, labels }) {
  const octokit = getOctokit(token);
  return octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: Number(issueNumber),
    labels,
  });
}
