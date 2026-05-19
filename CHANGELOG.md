# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Cost guard under-counted by up to 82%** on thinking-enabled Gemini models (2.5+/3.x flash). `record()` now reads `responseTokenCount` and `thoughtsTokenCount` from the API usage metadata, so `tokens-used` matches `totalTokenCount` from Google exactly. Discovered via live API smoke test — would not have been caught by static review alone.
- `output=summary` mode now writes to `$GITHUB_STEP_SUMMARY` instead of falling through with a warning.
- `dispatchOutput` extracted from `runner.js` into `src/output.js` so it can be unit-tested without triggering `main()` as a side effect.
- `changelog-from-prs` and `weekly-dependency-audit` examples now pass collected data into the prompt via step outputs; previously they wrote files the action had no way to read.
- `auto-label-by-content` example raised `max-tokens` from 200 to 1500 — the previous cap failed preflight for any realistic issue body.
- CI test step no longer swallows failures with `|| true`.
- README claims about `BudgetExceededError` corrected (no `iteration` or `last skill` fields) and cost-cap timing accurately described (preflight + per-iteration, not pre-call abort on every call).
- README skill-injection format corrected (`## Skill: name` markdown, not `<skill-body>` XML).

### Changed
- `output: artifact` is deprecated and now emits a warning while behaving like `output: file`. The README and `action.yml` recommend pairing `output: file` with `actions/upload-artifact`.
- `auto-label-by-content` and `weekly-dependency-audit` examples now create their labels via `gh label create --force` before applying, so first-run does not 422.
- `context: none` documented as a valid value in `action.yml` and README.

### Added
- Regression tests for `dispatchOutput` covering `file`, `artifact`, `summary`, `none`, and the `comment` token-missing fallback.
- New `thinking-budget` input. `0` disables thinking for predictable cost; `-1` lets the model decide; positive integer caps thinking. Plumbed through `runner.js` → `api.js` → SDK `ThinkingConfig`.
- `scripts/verify-live.mjs` — local smoke test that calls the real Gemini API and prints raw usage + cost-guard accounting side by side. Useful for validating model + thinking config before launch.

## [0.1.0] - 2026-05-19

### Added
- Initial release of `flash-3.5-action`.
- Twelve inputs: `api-key`, `prompt`, `model`, `context`, `output`, `output-file`, `max-tokens`, `skills`, `agents-md`, `pr-number`, `issue-number`, `github-token`.
- Five example workflows: `pr-security-review`, `issue-triage`, `changelog-from-prs`, `weekly-dependency-audit`, `auto-label-by-content`.
- Skills loading from `.agent/skills` via SKILL.md frontmatter.
- `AGENTS.md` prepended to system prompt when present.
- Cost guard that aborts when `max-tokens` is exceeded.
- Context assembly modes: `pr`, `issue`, `files`, `repo`, `auto`.
- Output modes: `comment`, `summary`, `file`, `artifact`.
- Bundled distribution via `@vercel/ncc` in `dist/index.js`.

[Unreleased]: https://github.com/dariomonopoli-dev/flash-3.5-action/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dariomonopoli-dev/flash-3.5-action/releases/tag/v0.1.0
