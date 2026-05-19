# Flash 3.5 Action

Run Gemini 3.5 Flash on your repo from a GitHub workflow.

[![GitHub release](https://img.shields.io/github/v/release/dariomonopoli-dev/flash-3.5-action?include_prereleases&sort=semver)](https://github.com/dariomonopoli-dev/flash-3.5-action/releases)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-flash--3.5--action-blue)](https://github.com/marketplace/actions/flash-3-5-action)
[![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

![Smoke test passing against gemini-3.5-flash, Tokens used: 143; remaining=57](docs/smoke-test.png)

PR review, issue triage, changelog generation, dependency audits, content-based labeling, all from one workflow step.

I built this because [Gemini CLI is sunsetting for Google AI Pro, Ultra, and the free Code Assist tier on June 18, 2026](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/), and the existing wrappers either install a 150 MB CLI on every run or quietly under-count tokens by ignoring Gemini 2.5+/3.x thinking output.

Differences from `run-gemini-cli`: skills auto-discovery from `.agent/skills/`, a token budget that aborts on overrun, native `AGENTS.md` support, one config that works in Claude Code, Codex, and Antigravity 2.0.

> **Note**: This is a JS Action, not a composite. It calls Gemini directly via `@google/genai`. It's not a wrapper around Antigravity CLI because Antigravity CLI is closed-source and has no headless mode as of May 2026. If that changes, Antigravity will become an opt-in backend.

## Quick start

```yaml
# .github/workflows/pr-security-review.yml
name: PR Security Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: dariomonopoli-dev/flash-3.5-action@v1
        with:
          api-key: ${{ secrets.GEMINI_API_KEY }}
          prompt: |
            Review this pull request for security issues.
            Focus on injection, auth, secrets, and unsafe deserialization.
          context: pr
          output: comment
          max-tokens: 8000
```

The action grabs the PR diff, runs Gemini 3.5 Flash with your prompt, and posts the result as a single PR comment. Over the `max-tokens` cap it throws `BudgetExceededError` and the step fails. No silent overrun.

## Why this exists

`run-gemini-cli` works fine for many teams, but it's a composite action that installs the full Gemini CLI on every run. That's slow, heavy, and tied to the entire CLI surface even if you only want one workflow.

Flash 3.5 Action is the lightweight, Flash-only alternative. One bundled `dist/index.js`, no CLI install, no Node version mismatch, a real cost ceiling, and an interface shaped around the workflows people actually run in CI.

## Comparison

|  | flash-3.5-action | google-github-actions/run-gemini-cli |
|---|---|---|
| Action type | JS Action (bundled) | Composite |
| Cold start | ~2s | ~30–60s (full CLI install) |
| Token budget | Hard cap, run aborts | None |
| Default model | `gemini-3.5-flash` | `gemini-2.5-pro` |
| Skills (`.agent/skills/`) | Auto-discovered | Not native |
| `AGENTS.md` | First-class | Not native |
| Footprint | ~1 MB bundled | ~150 MB npm install |

If you need Vertex AI, Workload Identity Federation, or the full Gemini CLI extension catalog, stay on `run-gemini-cli`. Those are on the roadmap but not supported yet. See [docs/migration-from-gemini-cli.md](docs/migration-from-gemini-cli.md) for the input-by-input mapping.

## Inputs

| Name | Required | Default | Description |
|---|---|---|---|
| `api-key` | yes | - | Gemini API key. Store as a repo secret (typically `GEMINI_API_KEY`). Never log this value. |
| `prompt` | yes | - | The instruction handed to the agent. Multi-line YAML works. Skill bodies and `AGENTS.md` are appended automatically. |
| `context` | no | `auto` | One of `pr`, `issue`, `files`, `repo`, `none`, `auto`. `auto` picks based on the triggering event. |
| `output` | no | `comment` | One of `comment`, `summary`, `check`, `file`, `none`. Pair `file` with `actions/upload-artifact` to upload. |
| `output-file` | no | `flash-output.md` | Path used when `output` is `file`. Relative to the workspace. |
| `model` | no | `gemini-3.5-flash` | Model ID. Only override if you have access to a newer Flash variant. |
| `max-tokens` | no | `8000` | Hard cap on total tokens (prompt + response + thinking). Preflight aborts before the first call if the estimate already exceeds the cap; otherwise overruns are capped at one final completion. |
| `thinking-budget` | no | _model default_ | Thinking-token cap for Gemini 2.5+/3.x flash models. `0` disables thinking for predictable cost. `-1` lets the model decide. Positive integer caps thinking at that many tokens. |
| `skills` | no | `.agent/skills` | Directory of `SKILL.md` files. Auto-discovered and offered to the agent on request. |
| `agents-md` | no | `AGENTS.md` | Path to the `AGENTS.md` file. Injected as a system message if present. |
| `pr-number` | no | from event | Override the PR number resolved from the triggering event. |
| `issue-number` | no | from event | Override the issue number resolved from the triggering event. |
| `github-token` | no | `${{ github.token }}` | Token used for PR comments and check runs. |

## Outputs

| Name | Description |
|---|---|
| `summary` | Full text response from the agent. |
| `error` | Error message if the run failed. Empty string on success. |
| `artifact-path` | Path to the file written when `output: file`. Pair with `actions/upload-artifact` to upload. |
| `tokens-used` | Total tokens consumed across all iterations. |
| `budget-remaining` | `max-tokens` minus `tokens-used`, clamped at 0. |

## Auth

Get a Gemini API key from [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and add it as a repo secret:

1. **Settings → Secrets and variables → Actions**.
2. **New repository secret**.
3. Name: `GEMINI_API_KEY`. Value: your key.
4. Reference it as `${{ secrets.GEMINI_API_KEY }}`.

`GITHUB_TOKEN` is provided automatically by GitHub Actions. You only need your own PAT if you want broader scopes than the default token's `permissions:` block.

## Examples

Five complete workflows live in [`examples/`](examples/). Copy any of them into `.github/workflows/` and adjust the prompt:

- [examples/pr-security-review.yml](examples/pr-security-review.yml): Security-focused PR review on every open/sync.
- [examples/issue-triage.yml](examples/issue-triage.yml): Auto-classifies and labels new issues.
- [examples/changelog-from-prs.yml](examples/changelog-from-prs.yml): Generates CHANGELOG sections from merged PRs.
- [examples/weekly-dependency-audit.yml](examples/weekly-dependency-audit.yml): Scheduled dependency vulnerability audit.
- [examples/auto-label-by-content.yml](examples/auto-label-by-content.yml): Labels issues by content using a controlled allowlist.

## Skills and AGENTS.md

Skills are short, named instructions the agent can pull in mid-run. They live in `.agent/skills/<name>/SKILL.md` and use the same format as Anthropic's Skills system. The runner discovers them at startup, shows the agent just their `name` and `description`, and only injects the body when the agent explicitly asks for it.

### Sample skill

```markdown
---
name: security-review
description: Checklist-driven security review for pull requests. Use when reviewing diffs for vulnerabilities.
metadata:
  type: review
---

# Security Review

Review the provided diff against the checklist below. Cite specific lines.

## Injection
- SQL injection (string-concatenated queries)
- Command injection (shell calls with user input)
- Template injection (unescaped values in templates)

## Authentication and authorization
- Missing auth checks on new endpoints
- Hardcoded credentials or tokens
- Improper session handling

## Data handling
- Unsafe deserialization
- Path traversal in file operations
- PII logged in error messages

## Output format

Return a Markdown report with one section per finding. Severity must be one of:
CRITICAL, HIGH, MEDIUM, LOW. If nothing turns up, return "No issues found."
```

### Sample AGENTS.md

`AGENTS.md` lives at the repo root and is injected as a system message on every run. The same file works with Claude Code, Codex, Antigravity 2.0, and this action.

```markdown
# AGENTS.md

## Project
Server-side TypeScript service. Node 20. Strict TS. ESM only.

## Conventions
- Immutable data structures. No in-place mutation.
- Errors thrown as typed classes, never plain strings.
- No `console.log` in shipped code; use the `logger` module.

## Review priorities
1. Correctness and type safety
2. Security (injection, auth, secrets)
3. Performance (N+1 queries, unbounded loops)
4. Readability

## Out of scope
- Style nits the formatter handles
- Speculative refactors not tied to the diff
```

### Skill loading protocol

The agent doesn't see skill bodies by default. To request one, it emits a self-closing tag on its own line:

```
<skill name="security-review"/>
```

The runner parses the tag, looks up the skill, and appends the body to the user prompt for the next iteration under a `## Skill: <name>` heading. The system prompt stays small; the agent only pulls in what it needs.

## Cost controls

`max-tokens` is a hard cap, not a soft target. Enforcement happens in two places:

1. **Preflight**. Before the first API call, the runner estimates input tokens from `systemPrompt + userPrompt` using a 4-chars/token heuristic. If that estimate already exceeds the cap, the run aborts before any billing.
2. **Per-iteration**. After each model call the runner records the API-reported token usage. If the running total crosses the cap, the next iteration is skipped and the loop exits with a `BudgetExceededError`.

The runner counts all three billable categories: prompt input, visible response, and hidden "thinking" tokens used by Gemini 2.5+/3.x flash models. It reads `responseTokenCount` and `thoughtsTokenCount` directly from the API's usage metadata, so reported `tokens-used` matches what Google bills.

One caveat: the *last* call that tips the budget isn't aborted mid-flight, since a synchronous API can't be cancelled once the request is in motion. But every subsequent call is suppressed, so a runaway loop costs at most one extra completion.

For predictable cost, set `thinking-budget: 0`. For code review and triage where reasoning quality matters, leave it at the default.

### Verified numbers

Same 25-token prompt ("In one sentence: what is a GitHub Action?") against `gemini-3.5-flash`:

| Mode | Latency | Prompt | Response | Thinking | Total billed |
|---|---|---|---|---|---|
| `thinking-budget` unset (model default) | 2.16s | 25 | 40 | 295 | **360** |
| `thinking-budget: 0` (disabled) | 0.97s | 25 | 38 | 0 | **63** |
| `thinking-budget` unset (second run) | 2.38s | 25 | 38 | 367 | **430** |

Disabling thinking made this task ~2.2× faster and ~5.7× cheaper with no measurable quality difference. Good default for fixed-allowlist labeling and templated summaries. Leave it on for PR review.

`BudgetExceededError` carries `used` and `budget` and produces a message like `Token budget exceeded: 8210 > 8000`.

`tokens-used` and `budget-remaining` are populated even on abort, which makes it easy to graph spend or fail downstream steps when a run gets close to the ceiling.

## Migration from `run-gemini-cli`

For most workflows, migration is a one-line change:

```diff
- uses: google-github-actions/run-gemini-cli@v0
+ uses: dariomonopoli-dev/flash-3.5-action@v1
```

Input names differ slightly (`gemini_api_key` → `api-key`, `gemini_model` → `model`). Full mapping and side-by-side YAML diffs for the top three use cases live in [docs/migration-from-gemini-cli.md](docs/migration-from-gemini-cli.md).

## Roadmap

No date promises beyond the June 18 deadline.

- **v0.2**: TypeScript migration, response streaming.
- **v0.3**: Native artifact format that mirrors Antigravity task artifacts.
- **v0.4**: Dynamic subagent orchestration (`<subagent .../>` tags with isolated context windows).
- **v1.0**: Optional Antigravity CLI backend, switchable via `backend:` input, when `--headless` ships.

Not planned:

- A bespoke plugin marketplace. `AGENTS.md` plus skills covers most of what plugins do and stays portable.
- A streaming UI for action logs. GitHub's log viewer is fine.
- Multi-model routing. If you want Pro, use Pro.

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, build steps, and PR conventions. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Apache-2.0. See [LICENSE](LICENSE).

## Acknowledgments

- [`google-github-actions/run-gemini-cli`](https://github.com/google-github-actions/run-gemini-cli) is the structural reference for this action. Many of the input names and event-handling patterns mirror that project, on purpose, to make migration cheap.
- The `SKILL.md` format and skill-request protocol are adopted from Anthropic's Skills system.
- Not affiliated with Google, Anthropic, or any model provider. "Gemini" and related marks belong to their respective owners.


