# design.md

This document is specific to `agents/rainmaker`.

## Purpose

Rainmaker is the KB markdown generator agent for this monorepo.

Its job is to produce markdown knowledge documents that conform to KBMD-QA v1.0 and are intentionally optimized for:

- low-inference retrieval
- high lexical match
- precise citationability
- narrow subject scope
- deterministic downstream querying and validation

## Primary design position

Rainmaker is not a general writing assistant. It is a constrained document generator whose output should make Rainman and Rainguard more reliable.

## System prompt contract

The canonical prompt is stored in `./SYSTEM.md`.
The shared KBMD-QA v1.0 specification source of truth in the repository is `../../docs/KBMDQA_V1_SPEC.md`.
For runtime use, the Rainmaker container image should expose the spec at `/app/specs/KBMDQA_V1_SPEC.md`.

Key behavioral requirements include:

- output markdown only
- emit one complete file only
- follow KBMD-QA v1.0 exactly
- keep one file to one answerable subject
- make decisive facts locally self-contained
- make exceptions and conflicts explicit
- remove filler prose

## Expected evolution

Future implementation should treat the prompt as a behavioral contract and make the shared spec available at runtime so generation flows can reference `/app/specs/KBMDQA_V1_SPEC.md` directly when needed.

Supporting code will likely build around:

- document generation workflows
- KBMD-QA structure enforcement
- source-to-draft authoring assistance
- possible integration with mounted KB contribution flows
