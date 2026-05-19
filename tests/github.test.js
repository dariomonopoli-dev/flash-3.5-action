// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseRepo, writeFile } from '../src/github.js';

test('parseRepo splits owner/repo', () => {
  assert.deepEqual(parseRepo('octocat/hello-world'), {
    owner: 'octocat',
    repo: 'hello-world',
  });
});

test('parseRepo throws on bad input', () => {
  assert.throws(() => parseRepo(''), /Invalid GITHUB_REPOSITORY/);
  assert.throws(() => parseRepo(null), /Invalid GITHUB_REPOSITORY/);
  assert.throws(() => parseRepo('just-a-name'), /expected owner\/repo/);
  assert.throws(() => parseRepo('/repo'), /expected owner\/repo/);
  assert.throws(() => parseRepo('owner/'), /expected owner\/repo/);
});

test('writeFile creates parent directories and writes content', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'flash-test-'));
  try {
    const target = path.join(tmp, 'nested', 'dir', 'output.md');
    const written = await writeFile({ path: target, content: 'hello' });
    assert.equal(written, target);
    const back = await readFile(target, 'utf8');
    assert.equal(back, 'hello');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
