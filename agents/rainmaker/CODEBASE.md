# codebase.md

This document is specific to `agents/rainmaker`.

## Current state

The current codebase is a minimal scaffold with:

- `README.md`
- `DESIGN.md`
- `CODEBASE.md`
- `SYSTEM.md`
- `src/index.ts`

## Source-of-truth guidance

Until fuller implementation exists, the most important artifacts in this package are:

- `SYSTEM.md`
- `../../docs/KBMDQA_V1_SPEC.md`

`SYSTEM.md` defines the behavioral contract, while `../../docs/KBMDQA_V1_SPEC.md` is the shared specification source of truth.
For runtime use, the Rainmaker image should copy that spec to `/app/specs/KBMDQA_V1_SPEC.md`.

## Intended implementation direction

Future code in this package should preserve the following properties:

- generated output is markdown only
- generated output follows KBMD-QA v1.0 section and metadata requirements
- each generated file covers exactly one answerable subject
- decisive facts are optimized for downstream lexical retrieval and citation validation
- conflicts are made explicit rather than normalized away
- runtime workflows can reference the baked spec file at `/app/specs/KBMDQA_V1_SPEC.md`
