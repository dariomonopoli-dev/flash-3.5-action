# Inputs Reference

All inputs for `flash-3.5-action`, with defaults and notes.

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `api-key` | yes | — | Gemini API key. Pass via `${{ secrets.GEMINI_API_KEY }}`. |
| `prompt` | yes | — | The instruction for the agent. Multiline supported. |
| `model` | no | `gemini-3.5-flash` | Model name. |
| `context` | no | `auto` | Context assembly mode. One of `pr`, `issue`, `files`, `repo`, `auto`. |
| `output` | no | `comment` | Where to send output. One of `comment`, `summary`, `file`, `artifact`. |
| `output-file` | no | `flash-output.md` | Path used when `output=file` or `output=artifact`. |
| `max-tokens` | no | `8000` | Hard cap on total input + output tokens. Run aborts if exceeded. |
| `skills` | no | `.agent/skills` | Directory containing `SKILL.md` files. Auto-loaded into the system prompt. |
| `agents-md` | no | `AGENTS.md` | Path to `AGENTS.md`. Prepended to the system prompt when present. |
| `pr-number` | no | event payload | PR number. Defaults to the triggering event. |
| `issue-number` | no | event payload | Issue number. Defaults to the triggering event. |
| `github-token` | no | `${{ github.token }}` | Token for posting comments, creating checks, and applying labels. |

## Notes

### `context=auto`
Detects PR, issue, or repo based on the event type. Use `pr` or `issue` to force.

### `output=comment`
Requires `pr-number` or `issue-number` (taken from event payload by default). Posts the agent response as a comment.

### `max-tokens`
Sums input and output tokens. If the projected sum would exceed the cap, the run aborts before calling the model. Tune higher for repo-wide scans.

### `skills`
Each `SKILL.md` must include frontmatter with `name` and `description`. The action loads skill descriptions into the system prompt; the model decides which to use.
