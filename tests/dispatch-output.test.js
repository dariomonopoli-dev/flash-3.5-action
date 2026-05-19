// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile as fsWriteFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { dispatchOutput } from '../src/output.js';

test('dispatchOutput "file" writes finalText to outputFile and returns path', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'flash-dispatch-'));
  try {
    const target = path.join(tmp, 'out.md');
    const ret = await dispatchOutput({
      output: 'file',
      outputFile: target,
      finalText: 'agent response',
    });
    assert.equal(ret, target);
    assert.equal(await readFile(target, 'utf8'), 'agent response');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('dispatchOutput "artifact" writes file and returns path', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'flash-dispatch-'));
  try {
    const target = path.join(tmp, 'artifact.md');
    const ret = await dispatchOutput({
      output: 'artifact',
      outputFile: target,
      finalText: 'artifact body',
    });
    assert.equal(ret, target);
    assert.equal(await readFile(target, 'utf8'), 'artifact body');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('dispatchOutput "none" writes nothing and returns ""', async () => {
  const ret = await dispatchOutput({
    output: 'none',
    outputFile: '/should/not/be/written.md',
    finalText: 'ignored',
  });
  assert.equal(ret, '');
});

test('dispatchOutput "summary" appends to GITHUB_STEP_SUMMARY file', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'flash-dispatch-'));
  const summaryFile = path.join(tmp, 'step-summary');
  await fsWriteFile(summaryFile, '', 'utf8');
  const prev = process.env.GITHUB_STEP_SUMMARY;
  process.env.GITHUB_STEP_SUMMARY = summaryFile;
  try {
    const ret = await dispatchOutput({
      output: 'summary',
      outputFile: 'unused.md',
      finalText: '# Agent summary\n\nDetails.',
    });
    assert.equal(ret, '');
    const written = await readFile(summaryFile, 'utf8');
    assert.match(written, /Agent summary/);
    assert.match(written, /Details\./);
  } finally {
    if (prev === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = prev;
    await rm(tmp, { recursive: true, force: true });
  }
});

test('dispatchOutput "comment" without token falls back to writing file', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'flash-dispatch-'));
  try {
    const target = path.join(tmp, 'fallback.md');
    const ret = await dispatchOutput({
      output: 'comment',
      outputFile: target,
      finalText: 'fallback body',
      githubToken: '',
      repository: '',
    });
    assert.equal(ret, target);
    assert.equal(await readFile(target, 'utf8'), 'fallback body');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
