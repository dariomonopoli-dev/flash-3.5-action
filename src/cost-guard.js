// SPDX-License-Identifier: Apache-2.0

const CHARS_PER_TOKEN_HEURISTIC = 4;

export class BudgetExceededError extends Error {
  constructor(used, budget) {
    super(`Token budget exceeded: ${used} > ${budget}`);
    this.name = 'BudgetExceededError';
    this.used = used;
    this.budget = budget;
  }
}

export function createCostGuard({ budget }) {
  const cap = Number(budget) > 0 ? Number(budget) : Infinity;
  let inputTokens = 0;
  let outputTokens = 0;
  let calls = 0;

  function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN_HEURISTIC);
  }

  function record(usage, fallbackPrompt, fallbackResponse) {
    calls += 1;
    if (usage && typeof usage === 'object') {
      const promptT = Number(usage.promptTokenCount ?? usage.prompt_token_count ?? 0);
      // Newer Gemini SDK uses responseTokenCount; older returns candidatesTokenCount.
      const responseT = Number(
        usage.responseTokenCount ??
          usage.response_token_count ??
          usage.candidatesTokenCount ??
          usage.candidates_token_count ??
          0,
      );
      // Thinking tokens are billed against the output budget but not always reflected
      // in responseTokenCount on thinking-enabled models (e.g. gemini-2.5/3.x flash).
      const thoughtsT = Number(usage.thoughtsTokenCount ?? usage.thoughts_token_count ?? 0);
      inputTokens += promptT;
      outputTokens += responseT + thoughtsT;
      return;
    }
    inputTokens += estimateTokens(fallbackPrompt);
    outputTokens += estimateTokens(fallbackResponse);
  }

  function total() {
    return inputTokens + outputTokens;
  }

  function remaining() {
    if (cap === Infinity) return Infinity;
    return Math.max(0, cap - total());
  }

  function assertWithinBudget() {
    if (total() > cap) {
      throw new BudgetExceededError(total(), cap);
    }
  }

  function preflight(estimatedNextCallTokens) {
    if (cap === Infinity) return true;
    return total() + estimatedNextCallTokens <= cap;
  }

  return {
    record,
    total,
    remaining,
    assertWithinBudget,
    preflight,
    estimateTokens,
    snapshot() {
      return {
        input: inputTokens,
        output: outputTokens,
        total: total(),
        budget: cap,
        remaining: remaining(),
        calls,
      };
    },
  };
}
