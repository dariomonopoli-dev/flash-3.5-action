# Skills

Skills are reusable prompt fragments stored as `SKILL.md` files. The action auto-discovers them from the `skills` input directory (default `.agent/skills`).

## File shape

Each skill is a markdown file with YAML frontmatter:

```markdown
---
name: pr-review
description: Review a pull request diff for correctness, security, and style.
---

# PR Review

When reviewing a PR:

1. Identify the change's intent from the title and description.
2. Read the diff hunk by hunk.
3. Flag issues by severity: CRITICAL, HIGH, MEDIUM, LOW.
4. Suggest concrete fixes, not vague concerns.
```

## How the action uses skills

On every run, the action:

1. Scans the `skills` directory for `*.md` files.
2. Parses frontmatter and validates `name` and `description`.
3. Injects skill names and descriptions into the system prompt.
4. The model decides which skill body to apply based on the user prompt.

## Layout

```
.agent/skills/
├── pr-review.md
├── issue-triage.md
└── changelog.md
```

## Naming

- `name` must be kebab-case and unique within the directory.
- `description` is a single sentence that helps the model pick the skill.

## Tips

- Keep skill bodies focused. A skill should do one thing well.
- Avoid duplicating content across skills — split shared instructions into AGENTS.md.
- Use the `examples/` workflows as starting points for skill-driven runs.
