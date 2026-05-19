# Security Policy

## Supported Versions

Only the latest minor release receives fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a Vulnerability

Please do **not** open a public issue for vulnerabilities.

Instead, use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository.

You should receive an acknowledgement within 72 hours. We aim to provide a fix or mitigation within 14 days for confirmed issues.

## Scope

In scope:
- The action runner code in `src/` and bundled `dist/`.
- Example workflows in `examples/`.
- Documentation that could mislead users into insecure configurations.

Out of scope:
- Issues in upstream dependencies (report those upstream).
- Issues caused by user misconfiguration outside the action's defaults.

## Handling Secrets

This action requires `GEMINI_API_KEY` to be passed via a workflow secret. Never commit API keys to a repository. The action does not log the key value, and bundled output is scanned for accidental key echoes.
