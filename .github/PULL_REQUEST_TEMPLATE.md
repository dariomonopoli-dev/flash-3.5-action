<!--
  Thanks for contributing to flash-3.5-action.
  Please fill in every section. Delete anything that genuinely does not apply.
-->

## Summary

<!-- One or two sentences explaining what this PR does and why. -->

## Changes

<!--
  Bullet list of concrete changes, grouped by area if the PR is large.
  Reference files, modules, or inputs/outputs touched.
-->

-
-

## Test plan

- [ ] `npm ci && npm run build` succeeds locally
- [ ] `node --test tests/` passes (or new tests added and passing)
- [ ] Ran the relevant example workflow against a scratch repo / branch
- [ ] Manually verified action outputs (`summary`, `error`, `artifact-path`, `tokens-used`, `budget-remaining`) where applicable
- [ ] Verified behaviour on both `pull_request` and `issues` triggers if the change touches event handling

## Related issues

<!-- Use "Closes #123" / "Fixes #123" / "Refs #123" as appropriate. -->

## Checklist

- [ ] `dist/` rebuilt if anything under `src/` changed (`npm run build` + commit)
- [ ] CHANGELOG entry added (or this PR is `[skip changelog]`)
- [ ] Example workflows under `examples/` still work with the modified inputs/outputs
- [ ] No new hardcoded secrets, API keys, or tokens
- [ ] Docs under `docs/` and `README.md` updated if user-facing behaviour changed
- [ ] Migration impact considered for users coming from `google-github-actions/run-gemini-cli`
