# sunny

Sunny is the interviewer agent in this monorepo.

## Current state

This package is currently a scaffold with an agent-local system prompt and documentation.

## Intended focus

- conduct structured SME interviews for KB maintenance
- revalidate stale KB claims and capture changed facts
- preserve uncertainty, scope boundaries, and contradictions
- produce structured interview result packages for downstream generation

## Prompt contract

- primary system prompt: `./SYSTEM.md`
- role: interviewer-agent
- output mode: structured interview findings, not free-form KB edits
