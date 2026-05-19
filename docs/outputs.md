# Outputs Reference

The action sets five outputs you can read from later workflow steps.

| Output | Type | Description |
| --- | --- | --- |
| `summary` | string | Full text response from the agent. |
| `error` | string | Error string when the run fails. Empty on success. |
| `artifact-path` | string | Path to the written file when `output=file` or `output=artifact`. |
| `tokens-used` | number | Total tokens consumed (input + output). |
| `budget-remaining` | number | Tokens left under the configured `max-tokens` cap. |

## Reading outputs

```yaml
- name: Run Flash
  id: flash
  uses: dariomonopoli-dev/flash-3.5-action@v0.1
  with:
    api-key: ${{ secrets.GEMINI_API_KEY }}
    prompt: "Summarise this PR."

- name: Print summary
  run: |
    echo "Summary: ${{ steps.flash.outputs.summary }}"
    echo "Tokens used: ${{ steps.flash.outputs.tokens-used }}"
    echo "Budget remaining: ${{ steps.flash.outputs.budget-remaining }}"
```

## Output modes

The `output` input controls *where* the response goes:

| Mode | Behaviour |
| --- | --- |
| `comment` | Post the response as a PR or issue comment. |
| `summary` | Append to the workflow run's GitHub step summary. |
| `check` | Create a GitHub check run on the head SHA. |
| `file` | Write to `output-file` and set `artifact-path`. Pair with `actions/upload-artifact` to upload. |
| `none` | Skip delivery; outputs are still set for downstream steps. |

The five outputs above are *always* set, regardless of mode, so downstream steps can react to the run.
