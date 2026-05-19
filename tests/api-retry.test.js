// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetryable } from '../src/api.js';

test('isRetryable: 429 (rate limit) is retryable', () => {
  assert.equal(isRetryable({ status: 429 }), true);
  assert.equal(isRetryable({ statusCode: 429 }), true);
  assert.equal(isRetryable({ message: 'got 429 Too Many Requests' }), true);
});

test('isRetryable: 503 (overloaded) is retryable', () => {
  assert.equal(isRetryable({ status: 503 }), true);
  assert.equal(isRetryable({ message: 'Service Unavailable (503)' }), true);
});

test('isRetryable: 500, 502, 504, 408 are retryable', () => {
  assert.equal(isRetryable({ status: 500 }), true);
  assert.equal(isRetryable({ status: 502 }), true);
  assert.equal(isRetryable({ status: 504 }), true);
  assert.equal(isRetryable({ status: 408 }), true);
});

test('isRetryable: network errors (ECONNRESET, ETIMEDOUT) are retryable', () => {
  assert.equal(isRetryable({ code: 'ECONNRESET' }), true);
  assert.equal(isRetryable({ code: 'ETIMEDOUT' }), true);
  assert.equal(isRetryable({ code: 'ENOTFOUND' }), true);
  assert.equal(isRetryable({ cause: { code: 'ECONNRESET' } }), true);
});

test('isRetryable: 4xx client errors are NOT retryable', () => {
  assert.equal(isRetryable({ status: 400 }), false);
  assert.equal(isRetryable({ status: 401 }), false);
  assert.equal(isRetryable({ status: 403 }), false);
  assert.equal(isRetryable({ status: 404 }), false);
});

test('isRetryable: malformed errors are NOT retryable', () => {
  assert.equal(isRetryable(null), false);
  assert.equal(isRetryable(undefined), false);
  assert.equal(isRetryable({}), false);
  assert.equal(isRetryable({ message: 'no idea what happened' }), false);
});

test('isRetryable: message-level "timed out" / "rate limit" / "overloaded" hints retry', () => {
  assert.equal(isRetryable({ message: 'request timed out after 30s' }), true);
  assert.equal(isRetryable({ message: 'rate limit exceeded for project' }), true);
  assert.equal(isRetryable({ message: 'model temporarily unavailable' }), true);
  assert.equal(isRetryable({ message: 'server is overloaded, try again' }), true);
});
