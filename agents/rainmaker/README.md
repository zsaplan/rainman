# rainmaker

Rainmaker is the KB markdown generator agent in this monorepo.

## Current state

This package is currently a scaffold with its agent-local documentation and system prompt in place.

## Intended focus

- generate KB markdown documents that conform to KBMD-QA v1.0
- optimize documents for retrieval, lexical coverage, citation precision, and deterministic answerability
- help author narrow, self-contained markdown knowledge articles for downstream querying and review

## Prompt contract

- primary system prompt: `./SYSTEM.md`
- shared spec source of truth in the repo: `../../docs/KBMDQA_V1_SPEC.md`
- runtime spec path in the container image: `/app/specs/KBMDQA_V1_SPEC.md`
- output mode: markdown only
- scope: one answerable subject per file
