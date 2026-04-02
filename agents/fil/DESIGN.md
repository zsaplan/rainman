# design.md

This document is specific to `agents/fil`.

## Purpose

Fil is the cleaner agent for the monorepo.

Its job is to scan KB freshness metadata, identify authoritative articles that need revalidation, and create structured interview requests for Sunny.

## Primary design position

Fil is not a content-generation or editing agent. It is a maintenance-orchestration agent that should operate from metadata, preserve evidence, suppress duplicate tickets, and escalate missing authority or malformed metadata.

## System prompt contract

The canonical prompt is stored in `./SYSTEM.md`.

Key behavioral requirements include:

- no direct KB editing
- one active ticket per doc_id
- explicit freshness classification
- explicit escalation path for missing experts and metadata defects
- structured InterviewRequest outputs

## Expected evolution

Future implementation should build around:

- KB inventory scanning
- freshness classification rules
- active ticket deduplication
- retriever-assisted request enrichment
- InterviewRequest dispatch and scan summaries
