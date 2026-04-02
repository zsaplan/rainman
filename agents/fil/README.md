# fil

Fil is the cleaner agent in this monorepo.

## Current state

This package is currently a scaffold with an agent-local system prompt and documentation.

## Intended focus

- scan KB metadata for stale, expiring, or expired authoritative articles
- create structured InterviewRequest payloads for Sunny
- enrich requests with retriever-agent context when useful
- escalate metadata defects and missing experts explicitly

## Prompt contract

- primary system prompt: `./SYSTEM.md`
- role: cleaner-agent
- output mode: structured interview requests and scan reports, not KB edits
