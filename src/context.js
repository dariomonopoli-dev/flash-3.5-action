// SPDX-License-Identifier: Apache-2.0
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getOctokit, context as ghContext } from '@actions/github';

const MAX_DIFF_CHARS = 80_000;
const MAX_FILE_CHARS = 40_000;

export async function assembleContext({ mode, token, prNumber, issueNumber }) {
  const resolved = mode === 'auto' ? autoDetect() : mode;

  switch (resolved) {
    case 'pr':
      return contextFromPr({ token, prNumber: prNumber || ghContext.payload?.pull_request?.number });
    case 'issue':
      return contextFromIssue({
        token,
        issueNumber: issueNumber || ghContext.payload?.issue?.number,
      });
    case 'files':
      return contextFromChangedFiles({ token });
    case 'repo':
      return { kind: 'repo', text: '' };
    case 'none':
      return { kind: 'none', text: '' };
    default:
      return { kind: 'unknown', text: '' };
  }
}

function autoDetect() {
  const event = ghContext.eventName;
  if (event === 'pull_request' || event === 'pull_request_target') return 'pr';
  if (event === 'issues' || event === 'issue_comment') return 'issue';
  if (event === 'push') return 'files';
  return 'repo';
}

async function contextFromPr({ token, prNumber }) {
  if (!token || !prNumber) {
    return { kind: 'pr', text: '(no PR context available)' };
  }
  const octokit = getOctokit(token);
  const { owner, repo } = ghContext.repo;
  const [{ data: pr }, { data: files }] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: Number(prNumber) }),
    octokit.rest.pulls.listFiles({ owner, repo, pull_number: Number(prNumber), per_page: 100 }),
  ]);

  const diffParts = [];
  let usedChars = 0;
  for (const file of files) {
    if (!file.patch) continue;
    const block = `--- ${file.filename} (${file.status}, +${file.additions} -${file.deletions})\n${file.patch}\n`;
    if (usedChars + block.length > MAX_DIFF_CHARS) {
      diffParts.push(`\n(truncated: ${files.length - diffParts.length} more files omitted)`);
      break;
    }
    diffParts.push(block);
    usedChars += block.length;
  }

  const text = [
    `# Pull Request #${pr.number}: ${pr.title}`,
    pr.body ? `\n${pr.body}\n` : '',
    `\n## Diff (${files.length} files)\n`,
    diffParts.join('\n'),
  ].join('');

  return { kind: 'pr', text, pr };
}

async function contextFromIssue({ token, issueNumber }) {
  if (!token || !issueNumber) {
    return { kind: 'issue', text: '(no issue context available)' };
  }
  const octokit = getOctokit(token);
  const { owner, repo } = ghContext.repo;
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: Number(issueNumber),
  });

  const text = [
    `# Issue #${issue.number}: ${issue.title}`,
    issue.body ? `\n${issue.body}\n` : '',
    `\nLabels: ${(issue.labels || []).map((l) => l.name || l).join(', ') || '(none)'}`,
  ].join('');

  return { kind: 'issue', text, issue };
}

async function contextFromChangedFiles({ token }) {
  if (!token) return { kind: 'files', text: '(no token)' };
  const octokit = getOctokit(token);
  const { owner, repo } = ghContext.repo;
  const sha = ghContext.sha;
  if (!sha) return { kind: 'files', text: '(no SHA)' };

  try {
    const { data: commit } = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
    const files = (commit.files || []).slice(0, 20);
    const parts = [`# Push to ${sha.slice(0, 7)}`];
    for (const file of files) {
      try {
        const full = await readFile(path.resolve(file.filename), 'utf8');
        const trimmed = full.length > MAX_FILE_CHARS ? `${full.slice(0, MAX_FILE_CHARS)}\n(truncated)` : full;
        parts.push(`\n--- ${file.filename}\n${trimmed}`);
      } catch {
        if (file.patch) parts.push(`\n--- ${file.filename} (patch only)\n${file.patch}`);
      }
    }
    return { kind: 'files', text: parts.join('\n'), files };
  } catch {
    return { kind: 'files', text: '(failed to fetch commit)' };
  }
}
