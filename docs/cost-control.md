# Cost Control

This action is built around a hard token cap. Runs that would exceed the cap abort *before* calling the model.

## How it works

1. The action assembles context (PR diff, issue body, file slice, or repo summary).
2. It estimates input tokens from the assembled context plus the prompt and skills.
3. It adds a reserve for output tokens.
4. If `estimated input + reserve > max-tokens`, the run aborts and reports what would have been spent.

## Tuning `max-tokens`

| Use case | Suggested cap |
| --- | --- |
| PR triage on small repos | 4000 |
| PR review with skills | 8000 (default) |
| Repo-wide audit | 20000 |
| Weekly digest across many PRs | 40000 |

The default of 8000 is chosen to keep a typical PR review well under a cent.

## Reading actual spend

Every run sets `tokens-used` and `budget-remaining` outputs. Pipe these into a workflow summary or a dashboard if you want to track spend over time:

```yaml
- name: Append to spend log
  run: |
    echo "$(date -u +%FT%TZ),${{ github.workflow }},${{ steps.flash.outputs.tokens-used }}" \
      >> .github/flash-spend.csv
```

## Picking a model

`gemini-3.5-flash` is the default and the cheapest current option suitable for code reasoning. Override `model` only when you need a larger context window or stronger reasoning — both come with proportional cost increases.

## What aborts look like

When the cap would be exceeded, the action exits non-zero with a message like:

```
flash-3.5-action: aborting before API call
  estimated input tokens : 9 200
  output reserve         : 1 500
  max-tokens             : 8 000
  shortfall              : 2 700
hint: raise max-tokens, narrow the context input, or trim AGENTS.md
```

This keeps unexpected bills from sneaking through a forgotten `context=repo` on a 200k-line monorepo.
