# design.md

## Document status

This document describes the intended design of the KB Expert Agent MVP, including the rationale behind each major decision. It is a design record, not an implementation transcript. Where this document and implementation drift, the implementation should be corrected unless there is an explicit recorded design change.

This document is specific to `agents/rainman` inside the monorepo. Treat the `agents/rainman` directory as the local repository root for relative paths below unless explicitly noted otherwise.

## Purpose

The system exists to answer narrow domain questions from a markdown knowledge base with a very strong bias toward correctness. It is not a general assistant. It is not a reasoning sandbox. It is not a search engine over arbitrary sources. It is a constrained evidence retrieval and response service.

The central design requirement is simple: unsupported answers are worse than no answer. The system therefore prefers abstention, explicit conflict reporting, and field-level evidence over fluent but weakly grounded output.

## Problem statement

We need a locally manageable API service that:

- uses Pi as the agent runtime
- uses GPT-5.4 through OpenRouter
- answers only from a markdown knowledge base
- returns highly structured responses through an API
- can be deployed and tested locally via Helm and kind
- minimizes architecture and operational surface area
- fails closed when evidence is insufficient or contradictory

The service is intended to be a narrow expert agent, not a broad conversational system.

## Primary design goals

### 1. Correctness before completeness

The service must only return `answered` when the response is directly supported by cited markdown evidence. If evidence is missing, ambiguous, or contradictory, the service must not approximate.

### 2. Minimal architecture

The MVP should use the smallest set of moving parts that can still provide strong correctness guarantees. Extra infrastructure is treated as a liability until it solves a demonstrated problem.

### 3. Deterministic evidence handling

Evidence must be inspectable by humans and verifiable by code. This rules out designs that depend solely on prompt obedience or opaque retrieval scoring.

### 4. Local operability

A single engineer must be able to build, run, validate, and inspect the system on a local workstation using Docker, Helm, and kind.

### 5. Safe extensibility

The MVP should be narrow, but the design should not paint the project into a corner. Future changes such as moving from `pi-coding-agent` to `pi-agent-core`, adding a schema registry, or refreshing the KB from Git should be possible without replacing the whole system.

## Non-goals

The following are explicitly out of scope for the MVP:

- general-purpose assistant behavior
- vector databases
- semantic retrieval infrastructure
- multi-tenant routing
- asynchronous workflows
- streaming APIs
- write access to the knowledge base
- shell execution by the agent
- autonomous KB maintenance
- broad tool surfaces beyond what is needed to read and validate markdown evidence

## Core constraints

### Runtime constraint

The initial implementation may use `@mariozechner/pi-coding-agent` for speed of delivery. The design should still preserve a path to later swap to `pi-agent-core` if the project needs a lower-level harness.

### Provider constraint

Inference is performed through GPT-5.4 on OpenRouter. No additional model gateway such as vLLM or Ollama is allowed in the MVP architecture.

### Knowledge constraint

The markdown knowledge base is the authoritative source for factual answers. The model may reason about the tool outputs, but it may not fill gaps using unstated world knowledge.

### Operational constraint

The system must be manageable locally through a Helm chart and validated in a kind cluster.

## Design principles

### Fail closed

If there is any doubt about supportability, the system rejects or abstains. The system should never silently downgrade from evidence-backed answers to plausible summaries.

### Evidence over fluency

The quality bar is grounded correctness, not polished natural language. Output tone should be terse and formal. The system is not expected to optimize for warmth or elaboration.

### Narrow tool surface

Every additional tool increases the chance of ungrounded behavior, unexpected side effects, or debugging complexity. The tool set is deliberately constrained to KB traversal and final result submission.

### Stateless request handling

Each request runs in a fresh in-memory session. This avoids cross-request contamination, makes behavior easier to reproduce, and keeps the service horizontally simple.

### Validator supremacy

Prompting influences behavior, but correctness is enforced by server-side validation. The validator is the final authority on whether a response is allowed to leave the service.

### Human-auditable answers

All returned claims should be traceable to concrete file paths and line ranges that a human can inspect.

## High-level architecture

The MVP consists of one stateless Node.js service running in one container.

At request time, the service:

1. accepts an API query
2. creates a fresh Pi session in memory
3. loads a strict system prompt
4. exposes only approved tools
5. lets the model traverse the KB
6. requires the model to finalize through `submit_result`
7. validates every populated field against cited markdown lines
8. returns the validated structured response

This architecture intentionally avoids a separate orchestrator, worker pool, queue, database, or retrieval service.

## Major design decisions and rationale

### Decision 1: Use a single stateless API service

The service is implemented as one Node/TypeScript process that contains the HTTP layer, Pi session harness, tool implementations, validation logic, and KB access.

#### Rationale

- minimizes moving parts
- reduces deployment and debugging complexity
- keeps request flow transparent
- avoids distributed failure modes in the MVP
- works well with local kind validation

#### Rejected alternative: split orchestrator and tool executor services

A multi-service design would add network hops, more Kubernetes objects, more failure modes, and little benefit at MVP scale.

### Decision 2: Use `@mariozechner/pi-coding-agent` for the initial MVP

The initial implementation uses Pi’s coding agent package because it provides a practical way to stand up sessions, tools, and prompting without building the lowest-level harness first.

#### Rationale

- faster path to an end-to-end working system
- adequate for a narrow read-only agent
- preserves a later migration path to `pi-agent-core`

#### Rejected alternative: start directly on `pi-agent-core`

Starting lower-level would likely produce more implementation work before reaching a usable validated MVP. That cost is not justified initially.

### Decision 3: Use one fresh in-memory session per request

Each HTTP request creates a fresh agent session and discards it after completion.

#### Rationale

- no cross-request memory leakage
- simpler debugging and replay
- easier correctness reasoning
- no need for persistent session storage in MVP

#### Tradeoff

The system does not preserve conversational context between calls. That is acceptable for this narrow evidence-querying service.

### Decision 4: Fix the output envelope instead of allowing arbitrary schemas

The API returns a fixed top-level structure with `status`, `data`, `citations`, `missingInformation`, `warnings`, and `meta`.

#### Rationale

- keeps validation strict and predictable
- reduces schema explosion
- simplifies bugfixing and regression testing
- makes future agent work more reliable because the contract is stable

#### Rejected alternative: user-supplied response schemas

Allowing arbitrary schemas would make validation, testing, and future maintenance much harder, especially in the MVP.

### Decision 5: Make field-level citations mandatory

Every populated answer field must map to one or more citations through a JSON pointer-like `path`.

#### Rationale

- makes grounding granular rather than global
- prevents vague “citation bag” behavior where only one part of the answer is actually supported
- makes bug diagnosis much easier

#### Tradeoff

This is stricter and somewhat more verbose than a single citation list. That strictness is deliberate.

### Decision 6: Enforce correctness through a `submit_result` tool and server-side validator

The model is not trusted to simply print the final answer. Instead, it must call `submit_result`, and the server validates that payload before returning anything.

#### Rationale

- makes finalization explicit and inspectable
- creates a single correctness gate
- allows the service to reject unsupported or malformed answers even when the model is overconfident

#### Rejected alternative: rely on model JSON mode alone

Structured output from the model is useful, but it is not sufficient. The critical guarantee must come from server-side verification.

### Decision 7: Restrict evidence to markdown `read` output only

The model may use `find` and `grep` to locate files, but only `read` may be used as evidence.

#### Rationale

- separates navigation from evidence
- avoids using search hits as proof
- makes validation deterministic and human-auditable

#### Rejected alternative: treat grep/find results as evidence

Search hits are not robust evidence. They are incomplete, context-light, and error-prone.

### Decision 8: Use a custom KB-safe `read` tool

The read tool is constrained to the KB root and markdown files only.

#### Rationale

- enforces the project’s core boundary condition
- prevents path traversal and accidental filesystem expansion
- ensures every citation comes from the intended corpus

#### Rejected alternative: use unrestricted filesystem reads

An unrestricted read tool would break the system’s trust model and complicate debugging and security.

### Decision 9: Keep the KB on the local filesystem inside the container

The authoritative KB is made available directly in the runtime filesystem under one mounted KB root. The application image is expected to include only a very shallow bootstrap KB, primarily to support smoke tests and local validation. Runtime knowledge articles beyond that bootstrap set are expected to be mounted into the same `kb/` directory.

The bootstrap KB should include files such as `_KB_INDEX.md` and `_WHOAMI.md`, but the service must treat any mounted markdown files under the KB root as equally authoritative.

In the current local kind workflow, a taskfile-managed Helm overlay injects a Git-sync-style sidecar that periodically performs a shallow pull from a separate GitHub repository using a Kubernetes Secret derived from `GITHUB_TOKEN` or `gh auth token`. The synced repository contents are written into a subdirectory under the mounted KB root so the bootstrap files remain available even when external KB content is unavailable.

#### Rationale

- keeps the runtime boundary simple and filesystem-based
- preserves deterministic local smoke-test content in the image
- allows the real knowledge corpus to change without rebuilding the service image
- keeps local and kind workflows straightforward while preserving a path to larger mounted KBs

#### Tradeoff

The running service depends on correct KB mount population. The current local sidecar-based sync path introduces repo-auth, polling, and freshness concerns that must not weaken correctness guarantees. The bootstrap KB intentionally remains in the image so the service can still support smoke tests and minimal identity queries even if the external sync path is unavailable.

### Decision 10: Avoid vector retrieval and semantic indexing in MVP

The initial system relies on KB structure, `_KB_INDEX.md`, `find`, `grep`, and `read` rather than semantic retrieval infrastructure.

#### Rationale

- keeps correctness traceable
- avoids operational complexity
- avoids false confidence from retrieval scores
- sufficient for narrow domain MVP if the KB is structured well

#### Rejected alternative: add embeddings or vector DB from day one

That would increase complexity before the base evidence and validation model has proven itself.

## Knowledge base design

The KB is part of the correctness mechanism, not just a content store.

### Required properties

- every authoritative document is markdown
- all KB content lives under one root
- a top-level `_KB_INDEX.md` helps navigation
- a top-level `_WHOAMI.md` provides bootstrap identity and local smoke-test context
- additional synced KB content may live in subdirectories under the same mounted KB root and must remain discoverable through recursive traversal
- important facts use short paragraphs, bullets, or semantic line breaks
- file paths are stable and predictable
- critical facts are not buried inside long paragraphs when avoidable

### Rationale

The validator works on file paths and line ranges. If the KB is written in a way that makes line-based evidence unstable or overly broad, the system becomes harder to validate and maintain.

### Design implication

KB authoring conventions are not optional polish. They are part of the system’s functional reliability.

## Prompting design

The prompt should encode operational behavior, not persona stereotypes.

### Required behavioral qualities

- literal
- terse
- formal
- low-inference
- evidence-first
- willing to abstain
- unwilling to guess
- unwilling to smooth contradictions

### Prompt intent

The prompt must make clear that:

- the markdown KB is authoritative
- prior knowledge must not be used for factual content
- only `read` output counts as evidence
- every populated field requires citations
- missing evidence must produce `insufficient_evidence`
- contradictory evidence must produce `conflict`
- the only valid completion path is `submit_result`

### Rationale

Persona language is noisy and ambiguous. Operational instructions are easier to evaluate and refine.

## Validation design

Validation is the strongest correctness control in the system.

### What the validator checks

- top-level response schema
- allowed `status` values
- required fields
- citation structure
- citation path to response field mapping
- file path is inside KB root
- cited file is markdown
- line ranges are valid
- quoted text matches actual file content for the cited range
- every populated field has supporting citations
- no unsupported populated fields are returned

### Why this matters

Without server-side validation, the system would still depend too heavily on model compliance. The validator transforms the service from a prompt-driven assistant into a constrained evidence API.

### Fail-closed semantics

If validation fails, the result is rejected and the model may retry. If retries are exhausted, the service returns an internal error rather than a weakly supported answer.

## API design rationale

The external API is intentionally small.

### Endpoints

- `POST /v1/query`
- `GET /healthz`
- `GET /readyz`

### Rationale

A narrow API surface makes client integration easy and keeps failure analysis straightforward.

### Response statuses

- `answered`: evidence supports the response
- `insufficient_evidence`: KB cannot safely answer
- `conflict`: KB contains contradictory evidence

These statuses are part of the domain contract. They are not cosmetic.

## Security model

The MVP still needs a real security posture, even if it runs locally.

### Security controls

- non-root container
- read-only root filesystem where practical
- KB access restricted to read-only
- no shell tool exposure
- no unrestricted file access
- path normalization and traversal rejection
- secret injection through Kubernetes Secret or local env vars
- no secret logging

### Rationale

The agent should not be able to escape its intended information boundary. That is both a security concern and a correctness concern.

## Observability design

Observability should be enough to debug correctness and deployment problems without exposing KB contents unnecessarily.

### Minimum logging

- request start and end
- request id
- provider/model id
- top-level status
- timing and latency
- validation failures
- internal errors
- optional debug-level tool traces

### What not to log

- secrets
- full KB contents
- full prompt content in production logs unless explicitly enabled for local debugging

### Rationale

This system will most often fail due to a small set of issues: path problems, citation mismatches, bad line numbering, provider misconfiguration, or prompt/tool misuse. Logs should make those visible.

## Kubernetes, Helm, and kind design

The deployment model is intentionally simple.

### Kubernetes objects

- one Deployment
- one Service
- one ConfigMap
- one Secret
- one set of Helm test Jobs

### Helm rationale

Helm provides a familiar local deployment and configuration mechanism with very low operational overhead for this scale.

### kind rationale

kind is sufficient to validate that:

- the container starts in Kubernetes
- the chart is correct
- config and secret wiring works
- the real API behaves correctly in-cluster

This is exactly the level of cluster realism needed for the MVP.

## Testing rationale

Testing must prioritize evidence integrity over broad functionality.

### Test layers

- unit tests for validator and safe tool behavior
- integration tests for request lifecycle and retry behavior
- golden tests against a fixture KB
- Helm test Jobs against a real kind deployment

### Mandatory golden scenarios

- fully answerable query
- answerable query that needs multiple files
- insufficient evidence
- conflicting evidence
- quote mismatch
- off-by-one citation issue
- path traversal attempt
- non-markdown file attempt
- empty citation set
- uncited populated field

### Rationale

The most damaging failures in this system are not crashes. They are incorrect answers that look valid. Tests therefore focus on preventing false positives.

## Known tradeoffs

### Tradeoff: less convenience for more trust

The system is stricter and more opinionated than a normal assistant API. That is intentional.

### Tradeoff: less scalability for more inspectability

Filesystem-based markdown traversal is not the most scalable retrieval design. It is the most inspectable design for the MVP.

### Tradeoff: less flexibility for easier maintenance

The fixed response envelope and narrow tool set reduce creativity but make the project easier to reason about, validate, and bugfix.

## Future-compatible evolution path

The MVP should leave room for the following future changes without requiring a ground-up redesign:

- migration from `pi-coding-agent` to `pi-agent-core`
- schema registry for multiple response shapes
- production-grade sidecar sync, auth rotation, and freshness policies for mounted KB content
- KB linting and consistency checks
- authn/authz on the API
- limited caching
- richer observability and metrics export
- more structured conflict explanations

These are future enhancements, not current requirements.

## Final design position

The system is deliberately narrow. It is an evidence service wearing an agent runtime, not an open-ended assistant. Every design choice supports that: one process, one KB boundary, one validator gate, one fixed response contract, and one strong bias toward abstention.

If future implementation decisions conflict with this philosophy, prefer the stricter interpretation unless there is an explicit design change recorded.
