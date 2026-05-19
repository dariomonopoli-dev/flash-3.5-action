// SPDX-License-Identifier: Apache-2.0
import * as core from '@actions/core';
import { assembleContext } from './context.js';
import { createCostGuard, BudgetExceededError } from './cost-guard.js';
import { callGemini } from './api.js';
import {
  discoverSkills,
  loadAgentsMd,
  buildSystemPrompt,
  findSkillRequest,
} from './skills.js';
import { dispatchOutput } from './output.js';

const MAX_ITERATIONS = 5;
const MAX_OUTPUT_TOKENS_CAP = 8192;

function parseThinkingBudget(raw) {
  if (raw === undefined || raw === '' || raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function readInputs() {
  const apiKey = process.env.INPUT_API_KEY;
  const prompt = process.env.INPUT_PROMPT;
  if (!apiKey) throw new Error('Missing required input: api-key');
  if (!prompt) throw new Error('Missing required input: prompt');
  return {
    apiKey,
    prompt,
    mode: process.env.INPUT_CONTEXT || 'auto',
    output: process.env.INPUT_OUTPUT || 'comment',
    outputFile: process.env.INPUT_OUTPUT_FILE || 'flash-output.md',
    model: process.env.INPUT_MODEL || 'gemini-3.5-flash',
    maxTokens: Number(process.env.INPUT_MAX_TOKENS || '8000'),
    thinkingBudget: parseThinkingBudget(process.env.INPUT_THINKING_BUDGET),
    skillsDir: process.env.INPUT_SKILLS || '.agent/skills',
    agentsMdPath: process.env.INPUT_AGENTS_MD || 'AGENTS.md',
    prNumber: process.env.INPUT_PR_NUMBER,
    issueNumber: process.env.INPUT_ISSUE_NUMBER,
    githubToken: process.env.INPUT_GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
  };
}

async function runAgentLoop({
  apiKey,
  model,
  systemPrompt,
  initialUserPrompt,
  skills,
  costGuard,
  thinkingBudget,
}) {
  const loaded = new Set();
  let userPrompt = initialUserPrompt;
  let finalText = '';

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const remaining = costGuard.remaining();
    if (remaining <= 0) {
      core.warning('No remaining budget; stopping.');
      break;
    }
    const maxOutputTokens = Math.min(
      MAX_OUTPUT_TOKENS_CAP,
      Number.isFinite(remaining) ? remaining : MAX_OUTPUT_TOKENS_CAP,
    );
    core.info(`Iteration ${i + 1}/${MAX_ITERATIONS} (remaining: ${remaining})`);

    const result = await callGemini({
      apiKey,
      model,
      systemInstruction: systemPrompt,
      userPrompt,
      maxOutputTokens,
      thinkingBudget,
      onRetry: ({ attempt, of, backoffMs, error }) => {
        core.warning(
          `Transient API error (attempt ${attempt}/${of}, backoff ${backoffMs}ms): ${
            error?.message || error
          }`,
        );
      },
    });
    costGuard.record(result.usage, userPrompt, result.text);
    finalText = result.text || finalText;

    try {
      costGuard.assertWithinBudget();
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        core.warning(`Budget exceeded: ${err.message}`);
        break;
      }
      throw err;
    }

    const requested = findSkillRequest(result.text || '');
    if (!requested || loaded.has(requested)) break;
    const skill = skills.find((s) => s.name === requested);
    if (!skill) {
      core.warning(`Requested skill not found: ${requested}`);
      break;
    }
    loaded.add(requested);
    core.info(`Loading skill: ${requested}`);
    userPrompt += `\n\n## Skill: ${skill.name}\n\n${skill.body}`;
  }
  return finalText;
}

async function main() {
  const inputs = readInputs();
  const costGuard = createCostGuard({ budget: inputs.maxTokens });

  const [skills, agentsMd, contextResult] = await Promise.all([
    discoverSkills(inputs.skillsDir),
    loadAgentsMd(inputs.agentsMdPath),
    assembleContext({
      mode: inputs.mode,
      token: inputs.githubToken,
      prNumber: inputs.prNumber,
      issueNumber: inputs.issueNumber,
    }),
  ]);
  core.info(`Loaded ${skills.length} skill(s); context kind=${contextResult.kind}`);

  const systemPrompt = buildSystemPrompt({ agentsMd, skills });
  const userPrompt = `${inputs.prompt}\n\n## Repo context\n\n${contextResult.text || '(no context)'}`;

  const preflightTokens = costGuard.estimateTokens(systemPrompt + userPrompt);
  if (!costGuard.preflight(preflightTokens)) {
    throw new Error(
      `Preflight failed: estimated ${preflightTokens} tokens exceeds budget ${inputs.maxTokens}. ` +
        'Reduce prompt size or raise max-tokens.',
    );
  }

  const finalText = await runAgentLoop({
    apiKey: inputs.apiKey,
    model: inputs.model,
    systemPrompt,
    initialUserPrompt: userPrompt,
    skills,
    costGuard,
    thinkingBudget: inputs.thinkingBudget,
  });

  const snapshot = costGuard.snapshot();
  core.info(`Tokens used: ${snapshot.total}; remaining=${snapshot.remaining}`);

  let artifactPath = '';
  try {
    artifactPath = await dispatchOutput({
      output: inputs.output,
      outputFile: inputs.outputFile,
      finalText,
      githubToken: inputs.githubToken,
      repository: inputs.repository,
      prNumber: inputs.prNumber,
      issueNumber: inputs.issueNumber,
    });
  } catch (err) {
    core.warning(`Output dispatch failed: ${err.message}`);
  }

  core.setOutput('summary', finalText);
  core.setOutput('error', '');
  core.setOutput('artifact-path', artifactPath);
  core.setOutput('tokens-used', String(snapshot.total));
  const rem = Number.isFinite(snapshot.remaining) ? snapshot.remaining : 0;
  core.setOutput('budget-remaining', String(rem));
}

main().catch((err) => {
  const message = err?.message || String(err);
  process.stderr.write(`flash-3.5-action error: ${message}\n`);
  core.setOutput('summary', '');
  core.setOutput('error', message);
  core.setOutput('artifact-path', '');
  core.setOutput('tokens-used', '0');
  core.setOutput('budget-remaining', '0');
  core.setFailed(message);
  process.exitCode = 1;
});
