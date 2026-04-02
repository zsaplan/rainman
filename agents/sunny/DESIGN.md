# design.md

This document is specific to `agents/sunny`.

## Purpose

Sunny is the interviewer agent for the monorepo.

Its job is to conduct structured interviews with defined experts, corroborate or update current KB claims, preserve uncertainty, and produce structured packages for downstream KB generation.

## Primary design position

Sunny is not a general chat assistant. It is a bounded interview agent that should ask one substantive question per turn, use retriever results as investigative input, and fail closed on unresolved contradiction or missing authority.

## System prompt contract

The canonical prompt is stored in `./SYSTEM.md`.

Key behavioral requirements include:

- one substantive question per turn
- explicit topic tracking
- explicit authority and scope checks
- explicit contradiction handling
- structured output suitable for generator-agent consumption

## Expected evolution

Future implementation should build around:

- InterviewRequest intake
- topic-by-topic interview state management
- retriever-assisted contradiction checks
- InterviewResultPackage emission
