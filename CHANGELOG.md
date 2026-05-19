# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-20

Initial public release. Built the day Gemini 3.5 Flash dropped.

### Added
- GitHub Action that runs Gemini 3.5 Flash on your repo from a single workflow step.
- Twelve inputs: `api-key`, `prompt`, `model`, `context`, `output`, `output-file`, `max-tokens`, `thinking-budget`, `skills`, `agents-md`, `pr-number`, `issue-number`, `github-token`.
- Five context modes: `pr`, `issue`, `files`, `repo`, `none`, `auto`.
- Five output modes: `comment`, `summary`, `check`, `file`, `none`.
- Five example workflows: `pr-security-review`, `issue-triage`, `auto-label-by-content`, `changelog-from-prs`, `weekly-dependency-audit`.
- `thinking-budget` input that exposes the Gemini 2.5+/3.x thinking-phase cap. `0` for predictable cost; `-1` lets the model decide; positive integer caps thinking at that many tokens.
- Skills loading from `.agent/skills` via `SKILL.md` frontmatter, with the agent requesting skills on demand via a `<skill name="..."/>` tag.
- `AGENTS.md` prepended to the system prompt when present, so the same conventions file works across Claude Code, Codex, Antigravity 2.0, and this action.
- Cost guard that reads `promptTokenCount`, `responseTokenCount`, and `thoughtsTokenCount` from the Gemini API. Reported `tokens-used` matches `totalTokenCount` from Google exactly. Aborts the loop on overrun with a `BudgetExceededError`.
- Retry on transient API failures (429, 503, network resets) with exponential backoff.
- `scripts/verify-live.mjs` for validating model + thinking config against your own key before shipping.
- 38 unit tests, smoke-test job in CI that runs the action end-to-end against the real Gemini API.

### Notes
- The bundled `dist/index.js` is committed and verified in sync with source on every CI run. The action runs on `node24`.
- `output: artifact` is accepted but treated as an alias for `output: file` and warns. Pair `output: file` with `actions/upload-artifact` to upload to the Actions artifact store.

[Unreleased]: https://github.com/dariomonopoli-dev/flash-3.5-action/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dariomonopoli-dev/flash-3.5-action/releases/tag/v0.1.0
