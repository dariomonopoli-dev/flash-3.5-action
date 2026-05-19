// SPDX-License-Identifier: Apache-2.0
import * as core from '@actions/core';
import { context as ghContext } from '@actions/github';
import {
  parseRepo,
  postPrComment,
  postIssueComment,
  createCheckRun,
  writeFile,
} from './github.js';

export async function dispatchOutput(opts) {
  const { output, outputFile, finalText, githubToken, repository, prNumber, issueNumber } = opts;
  const fallback = async (reason) => {
    if (reason) core.warning(reason);
    return writeFile({ path: outputFile, content: finalText });
  };

  if (output === 'none') return '';
  if (output === 'file') {
    return writeFile({ path: outputFile, content: finalText });
  }
  if (output === 'artifact') {
    core.warning(
      'output=artifact is deprecated and behaves like output=file. ' +
        'Use output=file and pair with actions/upload-artifact to upload.',
    );
    return writeFile({ path: outputFile, content: finalText });
  }
  if (output === 'summary') {
    await core.summary.addRaw(finalText, true).write();
    return '';
  }

  if (!githubToken || !repository) return fallback(`${output}: missing token/repository.`);
  const { owner, repo } = parseRepo(repository);

  if (output === 'check') {
    const sha =
      ghContext.payload?.pull_request?.head?.sha || ghContext.sha || process.env.GITHUB_SHA;
    if (!sha) return fallback('check: no head SHA available.');
    await createCheckRun({
      token: githubToken,
      owner,
      repo,
      sha,
      conclusion: 'neutral',
      summary: finalText,
    });
    return '';
  }
  if (output === 'comment') {
    if (prNumber) {
      await postPrComment({ token: githubToken, owner, repo, prNumber, body: finalText });
      return '';
    }
    if (issueNumber) {
      await postIssueComment({ token: githubToken, owner, repo, issueNumber, body: finalText });
      return '';
    }
    return fallback('comment: no PR/issue number available.');
  }
  return fallback(`Unknown output mode "${output}".`);
}
