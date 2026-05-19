// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCostGuard, BudgetExceededError } from '../src/cost-guard.js';

test('estimateTokens uses 4 chars/token heuristic, rounding up', () => {
  const guard = createCostGuard({ budget: 1000 });
  assert.equal(guard.estimateTokens(''), 0);
  assert.equal(guard.estimateTokens('abcd'), 1);
  assert.equal(guard.estimateTokens('abcde'), 2);
  assert.equal(guard.estimateTokens('abcdefghij'), 3);
});

test('record() accumulates from usage object', () => {
  const guard = createCostGuard({ budget: 1000 });
  guard.record({ promptTokenCount: 100, candidatesTokenCount: 50 });
  guard.record({ promptTokenCount: 30, candidatesTokenCount: 20 });
  const snap = guard.snapshot();
  assert.equal(snap.input, 130);
  assert.equal(snap.output, 70);
  assert.equal(snap.total, 200);
  assert.equal(snap.calls, 2);
});

test('record() supports snake_case usage keys', () => {
  const guard = createCostGuard({ budget: 1000 });
  guard.record({ prompt_token_count: 10, candidates_token_count: 5 });
  assert.equal(guard.snapshot().total, 15);
});

test('record() counts thoughtsTokenCount as output (thinking-enabled models)', () => {
  const guard = createCostGuard({ budget: 1000 });
  guard.record({
    promptTokenCount: 100,
    responseTokenCount: 50,
    thoughtsTokenCount: 200,
  });
  const snap = guard.snapshot();
  assert.equal(snap.input, 100);
  assert.equal(snap.output, 250, 'output must include thinking tokens');
  assert.equal(snap.total, 350);
});

test('record() prefers responseTokenCount over legacy candidatesTokenCount', () => {
  const guard = createCostGuard({ budget: 1000 });
  guard.record({
    promptTokenCount: 10,
    responseTokenCount: 7,
    candidatesTokenCount: 999, // should be ignored
  });
  assert.equal(guard.snapshot().output, 7);
});

test('record() falls back to character heuristic when no usage', () => {
  const guard = createCostGuard({ budget: 1000 });
  guard.record(null, 'abcd', 'efghijkl');
  assert.equal(guard.snapshot().input, 1);
  assert.equal(guard.snapshot().output, 2);
});

test('remaining() reports tokens left under cap', () => {
  const guard = createCostGuard({ budget: 100 });
  guard.record({ promptTokenCount: 30, candidatesTokenCount: 10 });
  assert.equal(guard.remaining(), 60);
});

test('remaining() never returns negative', () => {
  const guard = createCostGuard({ budget: 50 });
  guard.record({ promptTokenCount: 100, candidatesTokenCount: 50 });
  assert.equal(guard.remaining(), 0);
});

test('preflight() returns false when next call would exceed cap', () => {
  const guard = createCostGuard({ budget: 100 });
  guard.record({ promptTokenCount: 50, candidatesTokenCount: 20 });
  assert.equal(guard.preflight(20), true);
  assert.equal(guard.preflight(31), false);
});

test('preflight() always returns true with no budget', () => {
  const guard = createCostGuard({ budget: 0 });
  assert.equal(guard.preflight(10_000_000), true);
});

test('assertWithinBudget throws BudgetExceededError once cap is crossed', () => {
  const guard = createCostGuard({ budget: 100 });
  guard.record({ promptTokenCount: 80, candidatesTokenCount: 30 });
  assert.throws(() => guard.assertWithinBudget(), BudgetExceededError);
});

test('BudgetExceededError carries used and budget', () => {
  try {
    const guard = createCostGuard({ budget: 50 });
    guard.record({ promptTokenCount: 60, candidatesTokenCount: 0 });
    guard.assertWithinBudget();
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof BudgetExceededError);
    assert.equal(err.used, 60);
    assert.equal(err.budget, 50);
  }
});

test('budget of 0 disables the cap (Infinity)', () => {
  const guard = createCostGuard({ budget: 0 });
  guard.record({ promptTokenCount: 1_000_000, candidatesTokenCount: 1_000_000 });
  assert.doesNotThrow(() => guard.assertWithinBudget());
  assert.equal(guard.remaining(), Infinity);
});
