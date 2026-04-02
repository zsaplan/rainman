# rainguard

Rainguard is the KB markdown reviewer and QA agent in this monorepo.

## Current state

This package is currently a scaffold with its agent-local documentation and system prompt in place.

## Intended focus

- review KB markdown documents against KBMD-QA v1.0
- detect structural defects, retrieval-hostile patterns, duplicate scope, and contradiction risk
- use the Rainman query API as an investigative tool when checking overlap and contradiction

## Prompt contract

- primary system prompt: `./SYSTEM.md`
- shared spec source of truth in the repo: `../../docs/KBMDQA_V1_SPEC.md`
- runtime spec path in the container image: `/app/specs/KBMDQA_V1_SPEC.md`
- output mode: JSON only
- scope: structured review of candidate markdown documents
