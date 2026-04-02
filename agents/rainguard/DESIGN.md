# design.md

This document is specific to `agents/rainguard`.

## Purpose

Rainguard is the KB markdown reviewer and QA agent for this monorepo.

Its job is to review candidate markdown documents against KBMD-QA v1.0 and detect:

- structural defects
- retrieval-hostile prose patterns
- missing aliases and lexical coverage
- duplicate or overlapping authority
- contradiction risk
- unresolved scope ambiguity

## Primary design position

Rainguard is not a friendly reviewer. It is a fail-closed QA agent that should report concrete defects tersely and use Rainman as an investigative retriever when duplicate or contradiction risk needs evidence.

## System prompt contract

The canonical prompt is stored in `./SYSTEM.md`.
The shared KBMD-QA v1.0 specification source of truth in the repository is `../../docs/KBMDQA_V1_SPEC.md`.
For runtime use, the Rainguard container image should expose the spec at `/app/specs/KBMDQA_V1_SPEC.md`.

Key behavioral requirements include:

- return JSON only
- distinguish errors from warnings
- use the retriever agent API to investigate overlap and contradiction
- avoid rewriting unless explicitly asked
- report concrete defects and evidence

## Expected evolution

Future implementation should make the shared spec available at runtime so review flows can reference `/app/specs/KBMDQA_V1_SPEC.md` directly when needed.

Future implementation should build around:

- candidate document parsing
- KBMD-QA conformance checks
- duplicate and contradiction query workflows via Rainman
- structured JSON review outputs
