// SPDX-License-Identifier: Apache-2.0
import { GoogleGenAI } from '@google/genai';

const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN']);

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isRetryable(err) {
  if (!err) return false;
  // Network-level errors expose .code on the cause chain.
  const code = err.code || err.cause?.code;
  if (code && RETRYABLE_CODES.has(code)) return true;
  // HTTP-style errors: Gemini SDK surfaces status as err.status or in the message.
  const status = Number(err.status ?? err.statusCode ?? err.cause?.status);
  if (Number.isFinite(status) && RETRYABLE_STATUS.has(status)) return true;
  // Last resort: scan the message for known retryable status codes.
  const msg = String(err.message || '');
  if (/\b(408|429|500|502|503|504)\b/.test(msg)) return true;
  if (/(timed out|temporarily unavailable|rate limit|overloaded)/i.test(msg)) return true;
  return false;
}

export async function callGemini({
  apiKey,
  model,
  systemInstruction,
  userPrompt,
  maxOutputTokens,
  temperature,
  timeoutMs,
  thinkingBudget,
  maxRetries,
  onRetry,
}) {
  if (!apiKey) throw new Error('callGemini: apiKey is required');
  if (!model) throw new Error('callGemini: model is required');
  if (!userPrompt) throw new Error('callGemini: userPrompt is required');

  const client = new GoogleGenAI({ apiKey });

  const config = {
    temperature: temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  // Thinking budget: 0 disables (predictable cost), -1 lets the model decide, >0 caps it.
  // Only attach when explicitly provided so non-thinking models keep working unchanged.
  if (typeof thinkingBudget === 'number' && Number.isFinite(thinkingBudget)) {
    config.thinkingConfig = { thinkingBudget };
  }

  const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Math.max(0, maxRetries ?? DEFAULT_MAX_RETRIES);

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let timeoutHandle;
    try {
      const request = client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config,
      });
      const timer = new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`Gemini API call timed out after ${timeout}ms`)),
          timeout,
        );
      });

      const result = await Promise.race([request, timer]);

      const text = extractText(result);
      const usage = result?.usageMetadata || result?.response?.usageMetadata || null;
      const finishReason =
        result?.candidates?.[0]?.finishReason ||
        result?.response?.candidates?.[0]?.finishReason ||
        null;

      return { text, usage, finishReason };
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !isRetryable(err)) {
        throw new Error(`Gemini API call failed: ${err.message || String(err)}`);
      }
      const backoff = BASE_BACKOFF_MS * 2 ** attempt;
      if (typeof onRetry === 'function') {
        onRetry({ attempt: attempt + 1, of: retries, backoffMs: backoff, error: err });
      }
      await delay(backoff);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
  // Unreachable — the loop either returns or throws — but keep TS-style narrowing safe.
  throw lastErr;
}

function extractText(result) {
  if (!result) return '';
  if (typeof result.text === 'string' && result.text.length > 0) return result.text;
  if (typeof result.text === 'function') {
    try {
      const t = result.text();
      if (typeof t === 'string' && t.length > 0) return t;
    } catch {
      // fall through to manual extraction
    }
  }
  const candidates = result.candidates || result.response?.candidates || [];
  const parts = candidates[0]?.content?.parts || [];
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}
