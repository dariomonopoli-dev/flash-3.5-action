---
name: Bug report
about: Report a defect in flash-3.5-action
title: "[Bug] "
labels: bug, triage
assignees: dariomonopoli-dev
---

## Action version

<!-- e.g. dariomonopoli-dev/flash-3.5-action@v0.1.0 -->

## Workflow snippet

<!--
  Paste the minimum YAML needed to reproduce the bug.
  Redact any secret values before posting.
-->

```yaml
- uses: dariomonopoli-dev/flash-3.5-action@v0.1
  with:
    api-key: ${{ secrets.GEMINI_API_KEY }}
    prompt: "..."
    context: pr
    output: comment
```

## Log output

<!--
  Paste the relevant lines from the Actions run log.
  Enable debug logging by setting `ACTIONS_STEP_DEBUG=true` in repo secrets if needed.
-->

```
<paste log here>
```

## Expected behaviour

<!-- What should have happened. -->

## Actual behaviour

<!-- What actually happened. Include error messages verbatim. -->

## Gemini model used

<!-- e.g. gemini-3.5-flash, gemini-3.5-flash-lite, etc. -->

## Runner Node version

<!--
  From the Actions log: "Node version: vX.Y.Z".
  Or run `node --version` in a debug step.
-->

## Additional context

<!-- Anything else that might help — OS, runner type, recent dependency changes, etc. -->
