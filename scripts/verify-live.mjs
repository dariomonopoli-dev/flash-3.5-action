// SPDX-License-Identifier: Apache-2.0
// Local verification script: calls the real Gemini API once with a tiny prompt
// to confirm the bundled action works end-to-end. NOT part of the action runtime.
import { callGemini } from '../src/api.js';
import { createCostGuard } from '../src/cost-guard.js';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY env var is required.');
  process.exit(1);
}

const model = process.env.MODEL || 'gemini-3.5-flash';
const userPrompt =
  process.env.USER_PROMPT ||
  'In one sentence: what is a GitHub Action? Then on a new line write "SMOKE_TEST_OK".';
const maxOut = Number(process.env.MAX_OUTPUT_TOKENS || '2000');
const thinkingBudget =
  process.env.THINKING_BUDGET === undefined ||
  process.env.THINKING_BUDGET === ''
    ? undefined
    : Number(process.env.THINKING_BUDGET);

console.log(`Model:           ${model}`);
console.log(`Prompt:          ${userPrompt.slice(0, 80)}${userPrompt.length > 80 ? '...' : ''}`);
console.log(`maxOutputTokens: ${maxOut}`);
console.log(
  `thinkingBudget:  ${thinkingBudget === undefined ? '(model default)' : thinkingBudget}`,
);
console.log('---');

const guard = createCostGuard({ budget: 16_000 });

try {
  const t0 = Date.now();
  const result = await callGemini({
    apiKey,
    model,
    userPrompt,
    maxOutputTokens: maxOut,
    timeoutMs: 60_000,
    thinkingBudget,
  });
  const ms = Date.now() - t0;

  guard.record(result.usage, userPrompt, result.text);
  const snap = guard.snapshot();

  console.log('Response:');
  console.log(result.text);
  console.log('---');
  console.log(`Latency:       ${ms} ms`);
  console.log(`Finish reason: ${result.finishReason ?? '(none)'}`);
  console.log('Raw usage:     ', result.usage || '(none)');
  console.log(`Cost-guard in: ${snap.input}`);
  console.log(`Cost-guard out:${snap.output}  (includes thinking)`);
  console.log(`Cost-guard tot:${snap.total}`);
  console.log(`Has usage:     ${result.usage ? 'yes (from API)' : 'no (heuristic fallback)'}`);

  const ok = (result.text || '').includes('SMOKE_TEST_OK');
  console.log(`Smoke marker:  ${ok ? 'FOUND' : 'MISSING'}`);
  process.exit(ok ? 0 : 2);
} catch (err) {
  console.error('FAILED:', err.message || String(err));
  process.exit(1);
}
