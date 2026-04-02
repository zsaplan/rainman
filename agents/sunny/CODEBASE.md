# codebase.md

This document is specific to `agents/sunny`.

## Current state

The current codebase is a minimal scaffold with:

- `README.md`
- `DESIGN.md`
- `CODEBASE.md`
- `SYSTEM.md`
- `src/index.ts`

## Source-of-truth guidance

Until fuller implementation exists, the most important artifact in this package is `SYSTEM.md` because it defines the interviewer-agent behavioral contract.

## Intended implementation direction

Future code in this package should preserve the following properties:

- one-question-per-turn interview discipline
- explicit scope and authority checks
- retriever-assisted duplicate and contradiction investigation
- structured interview outputs rather than free-form narrative
- no direct KB publication or editing
