# codebase.md

This document is specific to `agents/rainguard`.

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

`SYSTEM.md` defines the review and output contract, while `../../docs/KBMDQA_V1_SPEC.md` is the shared specification source of truth.
For runtime use, the Rainguard image should copy that spec to `/app/specs/KBMDQA_V1_SPEC.md`.

## Intended implementation direction

Future code in this package should preserve the following properties:

- review output is JSON only
- review logic checks KBMD-QA v1.0 structure and metadata
- duplicate and contradiction findings are supported by explicit retriever-driven investigation
- unresolved overlap or contradiction is treated as a defect
- review remains terse, concrete, and fail-closed
- runtime workflows can reference the baked spec file at `/app/specs/KBMDQA_V1_SPEC.md`
