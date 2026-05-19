# Contributing

Thanks for your interest in improving Flash 3.5 Action. This document covers local setup, the build process, testing, and PR conventions.

## Local setup

Requirements:

- Node.js 20 or newer
- npm 10 or newer
- A Gemini API key for end-to-end testing (optional for most changes)

Clone and install:

```bash
git clone https://github.com/dariomonopoli-dev/flash-3.5-action.git
cd flash-3.5-action
npm install
```

## Project structure

```
flash-3.5-action/
├── action.yml              # Action metadata. Do not break input/output contract without a major version.
├── package.json            # Dependencies and build scripts.
├── src/                    # Source code (ES modules).
│   ├── index.js            # Entry point. Reads inputs, dispatches.
│   ├── runner.js           # Agent loop. Manages tokens, skills, iterations.
│   ├── context/            # Context loaders (pr, issue, files, repo).
│   ├── outputs/            # Output sinks (comment, check, file, artifact).
│   └── skills/             # Skill discovery and injection.
├── dist/                   # Bundled output. Committed to the repo.
├── tests/                  # Unit and integration tests.
├── examples/               # Workflow examples shown in the README.
└── docs/                   # Long-form documentation.
```

## Build

The action runs from a single bundled file at `dist/index.js`. Build with:

```bash
npm run build
```

This runs `@vercel/ncc` against `src/index.js` and writes the bundle and source map to `dist/`.

**Important:** `dist/` must be committed whenever `src/` changes. GitHub Actions does not run `npm install` for JS actions, so the bundled file is what users get. A PR that modifies `src/` without updating `dist/` will be rejected by CI.

## Testing

Run the test suite:

```bash
node --test tests/
```

Tests are written against the Node built-in test runner — no Jest, no Vitest. Keep them fast and free of network calls. The test suite is currently being filled in; see open issues tagged `area: tests` for what's needed.

For end-to-end verification:

1. Create a fork on GitHub.
2. Push a branch with your changes (including `dist/`).
3. Reference your fork in a test workflow: `uses: your-handle/flash-3.5-action@your-branch`.
4. Trigger the workflow on a real PR or issue.

## PR workflow

1. Branch from `main`. Use a descriptive name: `fix/budget-overrun-message`, `feat/streaming-output`.
2. Make your changes. Keep PRs focused — one logical change per PR.
3. Run `npm run build` and commit the updated `dist/`.
4. Run `node --test tests/` and make sure it passes.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `ci:`.
6. Link related issues in the PR description (`Closes #42`).
7. Update `CHANGELOG.md` under `## [Unreleased]` if your change is user-visible.

## Code style

- ES modules only. No CommonJS in `src/`.
- JSDoc types when they help. Full TypeScript migration is on the v0.2 roadmap.
- No `console.log`. Use `@actions/core` (`core.info`, `core.warning`, `core.error`, `core.debug`).
- Never log secrets. The runner masks `api-key` automatically via `core.setSecret`, but new code paths should not introduce raw key values into log lines.
- Prefer small, pure functions. Side effects belong in `runner.js`, `outputs/`, and `context/`.
- Immutable data where reasonable. Don't mutate arrays or objects returned from helpers.

## Releases

Releases are maintainer-only. The workflow is:

1. Bump the version in `package.json`.
2. Move `## [Unreleased]` entries in `CHANGELOG.md` under a new `## [x.y.z] - YYYY-MM-DD` heading.
3. Tag the release: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
4. Push the tag and the major-version alias: `git push origin vX.Y.Z && git tag -f vX && git push -f origin vX`.
5. Create a GitHub Release with the changelog excerpt.

Semantic versioning applies. Breaking changes to action inputs, outputs, or default behavior bump the major version.

## Questions

Open an issue with the `question` label. For security issues, see [SECURITY.md](SECURITY.md) — do not file a public issue.
