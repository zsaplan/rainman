# codebase.md

This document is specific to `agents/fil`.

## Current state

The current codebase is a minimal scaffold with:

- `README.md`
- `DESIGN.md`
- `CODEBASE.md`
- `SYSTEM.md`
- `src/index.ts`

## Source-of-truth guidance

Until fuller implementation exists, the most important artifact in this package is `SYSTEM.md` because it defines the cleaner-agent behavioral contract.

## Intended implementation direction

Future code in this package should preserve the following properties:

- metadata-driven freshness classification
- explicit ticket deduplication
- retriever-assisted enrichment for duplicates and conflicts
- structured InterviewRequest outputs rather than KB edits
- explicit escalation for missing experts and malformed metadata
