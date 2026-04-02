# codebase.md

## Document status

This document is the detailed source-of-truth reference for the KB Expert Agent MVP implementation. It is written for future agentic development, maintenance, and bugfixing. It should describe what the codebase is supposed to do, how the major modules relate to each other, and which invariants must be preserved.

This document is intentionally more implementation-oriented than `design.md`.

This document is specific to `agents/rainman` inside the monorepo. Treat the `agents/rainman` directory as the local repository root for relative paths below unless explicitly noted otherwise.

## Audience

This document is for:

- future implementation agents
- maintainers debugging production or local issues
- reviewers checking that changes preserve the intended architecture

## Project summary

The codebase implements a narrow API service that answers questions from a markdown knowledge base using Pi and GPT-5.4 through OpenRouter.

The system is not allowed to answer from unsupported knowledge. It must read markdown files, gather evidence, and finalize through a validated structured result.

The single most important invariant is this:

> no response may leave the service unless every populated answer field is supported by verified citations from markdown files inside the KB root.

## High-level runtime flow

1. an HTTP client sends `POST /v1/query`
2. the API layer validates the incoming request body
3. a `requestId` is created
4. the agent service creates a fresh in-memory Pi session
5. the session is configured with:
   - strict system prompt
   - OpenRouter GPT-5.4 model selection
   - approved tools only
6. the model traverses the KB using `find`, `grep`, and `read`
7. the model must terminate by calling `submit_result`
8. `submit_result` invokes the validator
9. if the result passes validation, the API returns it
10. if validation fails, the model may retry until limits are reached
11. if a valid result is never produced, the request fails closed

## Required repository layout

The exact filenames may vary slightly, but the codebase should preserve the following logical structure.

```text
agent/
  src/
    api/
      app.ts
      routes.ts
      handlers/
        queryHandler.ts
        healthHandler.ts
        readyHandler.ts
      schemas/
        queryRequest.ts
        queryResponse.ts
    agent/
      createSession.ts
      executeQuery.ts
      modelConfig.ts
      systemPrompt.ts
      retryPolicy.ts
    tools/
      readTool.ts
      findTool.ts
      grepTool.ts
      submitResultTool.ts
      shared/
        pathGuards.ts
        toolErrors.ts
    validation/
      validateResult.ts
      validateCitations.ts
      fieldCoverage.ts
      lineReader.ts
      quoteMatcher.ts
      errors.ts
    kb/
      kbInfo.ts
      kbVersion.ts
    config/
      env.ts
      constants.ts
      logger.ts
    types/
      api.ts
      citations.ts
      tools.ts
      status.ts
    util/
      jsonPointer.ts
      ids.ts
      timing.ts
  kb/
    _KB_INDEX.md
    _WHOAMI.md
    mounted-kb/
      ...markdown files synced by sidecar...
    ...additional mounted markdown files...
  test/
    fixtures/
      kb/
      requests/
      expected/
    unit/
    integration/
    golden/
  helm/
    kb-agent/
      Chart.yaml
      values.yaml
      values-kind.yaml
      templates/
        deployment.yaml
        service.yaml
        configmap.yaml
        secret.yaml
        tests/
          test-health.yaml
          test-answered.yaml
          test-insufficient.yaml
          test-conflict.yaml
  Dockerfile
  package.json
  tsconfig.json
  README.md
```

The directory names are less important than the responsibilities. Preserve those.

The repository-owned `kb/` directory is expected to stay shallow and primarily support local smoke tests and image-baked bootstrap content. At runtime, additional markdown knowledge articles may be mounted into the same KB root under `kb/`. In the current local kind workflow, a repo-root `taskfile.yaml` renders a temporary Helm overlay that injects a Git-sync-style sidecar, creates a Kubernetes Secret from `GITHUB_TOKEN` or `gh auth token`, and shallow-syncs a separate GitHub knowledge-base repository into `kb/mounted-kb/`. The tools and validator must treat recursively discovered mounted markdown content under the KB root the same as image-baked markdown content.

## Module responsibilities

## `src/api`

Owns HTTP transport concerns only.

### Responsibilities

- create the HTTP server
- register routes
- parse and validate request payloads
- map internal domain errors to HTTP responses
- add request-scoped logging fields such as `requestId`
- never implement KB traversal or citation validation logic directly

### Non-responsibilities

- building the prompt
- tool definitions
- file reads
- evidence validation

## `src/agent`

Owns the Pi session harness and request-scoped agent execution.

### Responsibilities

- create a fresh in-memory Pi session per request
- load system prompt
- bind model/provider configuration
- register allowed tools only
- execute the agent loop
- enforce retry and timeout limits
- return only validated final output or an execution failure

### Required subcomponents

#### `createSession.ts`
Creates the Pi session and wires together tool registry, prompt, and provider/model configuration.

#### `executeQuery.ts`
Runs the full agent request lifecycle for one query.

#### `modelConfig.ts`
Resolves provider and model settings from environment and static defaults.

#### `systemPrompt.ts`
Contains the canonical system prompt. This file is high-risk. Changes here can alter agent behavior significantly.

#### `retryPolicy.ts`
Controls how many invalid result repairs are allowed and how tool/validation failures are surfaced back into the loop.

## `src/tools`

Owns the only tool surface exposed to the model.

### Allowed tools

- `read`
- `find`
- `grep`
- `submit_result`

No other tools should be reachable in the MVP.

### General invariant

Tool code must be deterministic, side-effect free except for logging, and easy to unit test.

### `readTool.ts`

This is the only evidence-producing tool.

#### Responsibilities

- read markdown files under the KB root
- enforce KB boundary checks
- reject non-markdown files
- support offset and limit semantics
- return line-numbered content in a stable format

#### Critical invariants

- must never read outside KB root
- must never read non-markdown files
- must not suggest shell fallback
- output numbering must remain consistent with validator expectations

### `findTool.ts`

Navigation-only helper for file discovery.

#### Responsibilities

- locate candidate files by path or filename patterns inside KB root
- return concise navigational information

#### Invariant

Its outputs are not evidence and must never be treated as evidence by validation logic.

### `grepTool.ts`

Navigation-only helper for content search.

#### Responsibilities

- search text patterns across markdown files in KB root
- return candidate file references and optionally line hints

#### Invariant

Like `find`, its outputs are never evidence.

### `submitResultTool.ts`

The only valid completion path.

#### Responsibilities

- accept the final structured payload from the model
- call validation modules
- return success only when validation passes
- return actionable tool errors when validation fails

#### Critical invariant

The API layer must not return freeform model output directly. A valid `submit_result` result is required.

## `src/validation`

Owns all correctness enforcement.

### This is the most critical part of the codebase.

If this subsystem is weak, the entire architecture becomes prompt-dependent and unreliable.

### Responsibilities

- schema validation
- citation validation
- file path safety validation
- line range validation
- quote verification
- field-to-citation coverage validation
- conflict between populated fields and citation support

### Important files

#### `validateResult.ts`
Main entry point for validating the agent’s final payload.

#### `validateCitations.ts`
Validates the structure and semantics of citations.

#### `fieldCoverage.ts`
Ensures every populated field is backed by one or more citations.

#### `lineReader.ts`
Reads exact line ranges from markdown files for validation. Must match the numbering model used by `readTool.ts`.

#### `quoteMatcher.ts`
Verifies that citation quotes match actual file contents.

#### `errors.ts`
Defines structured validation errors and machine-meaningful error codes.

## `src/config`

Owns runtime configuration and logging.

### Responsibilities

- parse environment variables
- provide typed configuration objects
- configure logger
- prevent startup on invalid configuration

### Important rule

Configuration should be validated at startup, not lazily during requests, except where request-specific values are unavoidable.

## `src/types`

Owns shared domain types and interfaces.

### Responsibilities

- top-level API request/response types
- citation types
- tool input/output contracts
- status enums and string unions

### Invariant

Types here are the shared language of the system. Avoid duplicating them elsewhere.

## Core data contracts

The following contracts should remain stable unless an intentional versioned change is made.

## Query request

```ts
interface QueryRequest {
  question: string;
}
```

### Rules

- `question` is required
- trim leading and trailing whitespace
- reject empty or whitespace-only questions

## Query response

```ts
interface QueryResponse {
  status: "answered" | "insufficient_evidence" | "conflict";
  data: Record<string, unknown>;
  citations: Citation[];
  missingInformation: string[];
  warnings: string[];
  meta: {
    requestId: string;
    model: string;
    kbVersion: string;
  };
}
```

## Citation contract

```ts
interface Citation {
  path: string;      // JSON-pointer-like path to populated response field
  file: string;      // KB-relative path
  startLine: number; // inclusive
  endLine: number;   // inclusive
  quote: string;
}
```

### Citation invariants

- `path` must refer to a populated field in the response
- `file` must be under KB root and point to `.md`
- line numbers must be valid for the file
- `startLine <= endLine`
- `quote` must match the actual file content of the cited range according to quote matching rules

## Status semantics

### `answered`
Use only when the data payload is supported by citations.

### `insufficient_evidence`
Use when the KB cannot safely answer the question.

### `conflict`
Use when relevant KB sources conflict and the conflict prevents a safe answer.

## Important codebase invariants

These invariants must hold after any code change.

1. no request shares agent memory with another request
2. no answer bypasses `submit_result`
3. no populated field is returned without citation coverage
4. no citation may reference content outside the KB root
5. no citation may reference a non-markdown file
6. no navigation tool output counts as evidence
7. validator line-number logic must match read tool line-number logic
8. readiness must fail when critical runtime configuration is invalid
9. secrets must never appear in normal logs
10. the service must fail closed when validation cannot establish support

## Request lifecycle in detail

## Step 1: HTTP request acceptance

`queryHandler.ts` receives the request body.

### Expected behavior

- validate body shape
- generate `requestId`
- attach request-scoped log context
- call agent execution service
- map returned domain response to HTTP 200
- map operational failures to appropriate HTTP 4xx or 5xx

## Step 2: Agent session creation

`createSession.ts` builds a fresh Pi session.

### Required behavior

- use in-memory session manager
- load strict system prompt
- register only the approved tools
- select GPT-5.4 via OpenRouter
- set per-request limits such as timeout or step cap if implemented

## Step 3: KB traversal

The model uses `find` and `grep` to locate candidate files and `read` to gather line-numbered evidence.

### Required behavior

- only markdown files under KB root are accessible
- tool errors should be machine-readable enough for the model to repair itself
- `find` and `grep` must not expose data outside the KB root

## Step 4: Finalization

The model must call `submit_result`.

### Required behavior

- accept only the expected result shape
- validate before final acceptance
- return success only when validation passes
- return repairable errors when possible

## Step 5: HTTP response

If validation passes, return the structured response. If not, and recovery is exhausted, return an operational failure rather than unsupported content.

## Tool contract details

## `read` tool

### Input

```ts
interface ReadInput {
  filePath: string;
  offset?: number;
  limit?: number;
}
```

### Notes

- `filePath` should be treated as KB-relative or resolvable under the KB root only
- line numbering must be explicitly defined and consistently enforced
- offset semantics must be documented in code and mirrored in tests

### Output

The output should be stable, line-numbered, and suitable for both model consumption and human inspection.

A representative format is:

```text
1 | First line
2 | Second line
3 | Third line
```

The exact formatting may vary, but it must be stable and must not make line extraction ambiguous.

### Common bug classes

- off-by-one line numbers
- path normalization mistakes
- mishandling of end-of-file conditions
- accidental inclusion of non-markdown content

## `find` tool

### Input

A file/path query.

### Output

A concise list of KB-relative matches.

### Common bug classes

- returning absolute filesystem paths
- returning files outside KB root
- unstable ordering

## `grep` tool

### Input

A text pattern and optional scope parameters.

### Output

Candidate file references and line hints.

### Common bug classes

- interpreting grep hits as evidence in downstream logic
- inconsistent path formatting
- returning excessive output that obscures useful results

## `submit_result` tool

### Input

The full `QueryResponse` payload except possibly `meta`, which may be completed server-side.

### Behavior

- validate structure
- validate citations
- validate populated field coverage
- add or verify `meta`
- return success only on a fully supported result

### Common bug classes

- accepting uncited fields
- accepting line ranges that do not match quotes
- failing open on validator exceptions

## Validation subsystem algorithm

`validateResult.ts` should follow a clear staged algorithm.

### Recommended order

1. validate top-level schema
2. validate allowed status value
3. validate that `data`, `citations`, `missingInformation`, and `warnings` are present
4. validate each citation structurally
5. resolve citation file paths safely under KB root
6. verify cited files are markdown
7. verify line ranges against actual file length
8. extract actual line content from files
9. verify quote matches file content
10. verify each populated field has citation coverage
11. verify citation paths refer to existing populated fields
12. return normalized validated result or structured validation errors

### Why order matters

Early cheap failures should be caught before filesystem work. Filesystem and quote verification should only occur after the basic structure is known to be sane.

## Quote matching policy

The quote matching policy must be defined in code and kept stable.

### Recommended MVP policy

- the quote must match the exact joined text of the cited lines after newline normalization
- whitespace normalization may be limited and must be documented
- do not use overly permissive fuzzy matching in the MVP

### Reason

Loose matching weakens the entire correctness model and makes debugging much harder.

## Field coverage policy

Every populated field in `data` must be covered.

### Practical rule

If `/data/foo/bar` is populated, there must be at least one citation whose `path` equals `/data/foo/bar`.

### Optional extension later

Support for parent-level citations can be added later, but the MVP should prefer exact field-level coverage because it is easier to validate and debug.

## Error taxonomy

The codebase should use explicit internal error classes or error codes.

## Categories

### Request errors

Client sent malformed input.

Map to HTTP 400.

### Readiness/config errors

Service is misconfigured or dependencies are unavailable.

Map `readyz` failure to HTTP 503.

### Tool validation errors

The model called a tool with invalid or unsafe arguments.

Usually surfaced back into the agent loop for self-repair.

### Result validation errors

The model attempted to finalize with unsupported or malformed output.

Usually surfaced back into the agent loop for self-repair.

### Execution errors

Provider failures, timeouts, exhausted retries, unexpected exceptions.

Map to HTTP 500 unless there is a more specific policy.

## Recommended validation error codes

- `INVALID_SCHEMA`
- `INVALID_STATUS`
- `INVALID_CITATION`
- `UNCITED_FIELD`
- `INVALID_CITATION_PATH`
- `PATH_ESCAPE`
- `NON_MARKDOWN_FILE`
- `LINE_RANGE_OUT_OF_BOUNDS`
- `QUOTE_MISMATCH`
- `UNKNOWN_FINALIZATION_STATE`

These codes are useful both for debugging and for allowing the model to repair failures during the same request.

## Configuration contract

Environment should be parsed into a typed config object.

## Required environment variables

- `OPENROUTER_API_KEY`
- `MODEL_ID`
- `KB_ROOT`
- `PORT`
- `LOG_LEVEL`

## Recommended startup validation

At startup, ensure that:

- required env vars are present
- KB root exists
- KB root is readable
- `_KB_INDEX.md` exists under KB root
- model identifier is non-empty
- port is valid

If startup validation fails, the service should not report ready.

## `readyz` semantics

`readyz` should fail when any critical condition is not met, including:

- invalid config
- missing KB root
- missing `_KB_INDEX.md`
- provider configuration missing

This endpoint should not pretend readiness if the service cannot answer requests correctly.

## Logging conventions

Use structured logs.

## Required fields where applicable

- `requestId`
- `event`
- `status`
- `model`
- `latencyMs`
- `errorCode`
- `errorMessage`

## Recommended event names

- `request.started`
- `request.completed`
- `request.failed`
- `agent.session.created`
- `tool.called`
- `tool.failed`
- `result.validation.failed`
- `result.validation.passed`
- `startup.config.valid`
- `startup.config.invalid`

## Logging caution

Do not log secrets. Avoid logging whole KB documents. In debug mode, log only the minimal tool payloads needed to diagnose issues.

## Testing strategy in codebase terms

## Unit tests

These should target pure logic wherever possible.

### Must cover

- path guard normalization
- markdown-only enforcement
- line extraction
- quote matching
- field coverage logic
- schema validation
- error code mapping

## Integration tests

These should exercise the real request path with a test provider or controlled environment where possible.

### Must cover

- full request execution
- successful finalization
- validation rejection and repair loop
- failure after retry exhaustion

## Golden tests

Golden tests use a fixed fixture KB and fixed expected API outputs.

### Must cover

- answerable single-file case
- answerable multi-file case
- insufficient evidence case
- conflict case
- off-by-one line bug regression
- path escape rejection
- non-markdown rejection
- empty citations rejection
- uncited field rejection
- quote mismatch rejection

## Helm and kind operational reference

## Helm chart expectations

The chart should remain small and transparent.

### Required templates

- Deployment
- Service
- ConfigMap
- Secret
- Helm test Jobs

### Required values

- image repository
- image tag
- image pull policy
- service port
- model id
- KB root
- KB bootstrap path
- log level
- resources
- OpenRouter secret wiring
- optional KB sidecar and volume wiring

## `values-kind.yaml`

This file exists only to make local kind workflows predictable.

### Typical expectations

- replica count = 1
- image tag points to locally loaded image
- `imagePullPolicy` set to `IfNotPresent` or `Never`
- small resource requests and limits
- static chart values remain free of GitHub credentials

The local sidecar wiring for KB sync is intentionally added at deploy time by the repo-root taskfile rather than committed into `values-kind.yaml`. That overlay uses a Kubernetes Secret populated from `GITHUB_TOKEN` or `gh auth token`, points the sidecar at a separate GitHub repository, and performs a shallow periodic sync into `kb/mounted-kb/`.

## kind local workflow reference

A typical maintenance loop is:

1. build image locally from the monorepo root
2. load image into kind
3. deploy via the repo-root taskfile so the KB sidecar overlay is rendered
4. wait for rollout
5. port-forward or run Helm tests
6. inspect app or sidecar logs if failures occur

Representative commands from the monorepo root:

```bash
docker build -f ./agents/rainman/Dockerfile -t localhost/rainman:dev .
export GITHUB_TOKEN=$(gh auth token)
export KIND_OPEN_ROUTER_API_KEY=...
task install-helm-rainman
helm test rainman -n rainman --kube-context kind-bc-local
```

## Bugfixing guide by symptom

## Symptom: citation line numbers look wrong

### Check

- `readTool.ts` numbering logic
- `lineReader.ts` numbering logic
- tests that assert exact line ranges
- whether offset semantics changed

### Most likely cause

Off-by-one drift between tool output and validator line extraction.

## Symptom: agent answers without enough support

### Check

- `fieldCoverage.ts`
- whether `submit_result` is the only finalization path
- whether API is accidentally returning raw model content
- prompt regressions in `systemPrompt.ts`

### Most likely cause

Validation weakened or bypassed.

## Symptom: path traversal vulnerability or weird file access

### Check

- `pathGuards.ts`
- normalization and relative path resolution
- symlink handling
- whether `find` and `grep` share the same boundary logic as `read`

### Most likely cause

Improper normalization or inconsistent boundary enforcement across tools.

## Symptom: readyz passes but requests fail immediately

### Check

- startup validation coverage
- whether `OPENROUTER_API_KEY` and `MODEL_ID` are truly validated
- whether KB root and `_KB_INDEX.md` are checked in readiness

### Most likely cause

Readiness checks are too shallow.

## Symptom: answer is correct but validator rejects it

### Check

- quote matching normalization rules
- citation path mapping
- line extraction logic
- whether the response contains populated fields without exact-path citations

### Most likely cause

Mismatch between intended response schema and validator strictness, or exact quote policy being violated.

## Symptom: conflict cases return insufficient evidence or vice versa

### Check

- prompt guidance around conflict handling
- golden fixtures for contradictory KB content
- whether the model is being guided to inspect multiple sources before finalizing

### Most likely cause

Prompt is underspecified or KB contradictory fixture is poorly constructed.

## Change management rules

Any change touching the following files requires extra care and regression testing:

- `systemPrompt.ts`
- `readTool.ts`
- `submitResultTool.ts`
- `validateResult.ts`
- `lineReader.ts`
- `fieldCoverage.ts`
- Helm tests

## If you change `readTool.ts`

You must re-run tests that prove:

- line numbering still matches validator logic
- non-markdown reads are still rejected
- path escapes are still rejected

## If you change `validateResult.ts`

You must re-run or expand tests for:

- uncited fields
- malformed citations
- quote mismatch
- bounds checking
- status handling

## If you change `systemPrompt.ts`

You must re-run golden tests for:

- abstention behavior
- conflict handling
- tool use discipline
- finalization via `submit_result`

## If you change Helm or deployment config

You must re-run:

- local container smoke test
- kind deployment
- `helm test`

## Source-of-truth priorities

When multiple artifacts disagree, use this priority order unless an explicit migration is underway:

1. validator-enforced behavior in code
2. stable API contract types
3. `codebase.md`
4. `design.md`
5. README convenience examples

Reason: code and validator behavior determine the real contract, but `codebase.md` is the primary maintenance reference when interpreting intended behavior.

## What future agents must preserve

Any future agent modifying this codebase must preserve the following properties unless a human explicitly requests a design change:

- answers are KB-authoritative only
- evidence comes only from markdown `read`
- `submit_result` remains mandatory
- field-level citation coverage remains enforced
- the service fails closed on unsupported output
- the deployment remains locally operable via Helm and kind
- no vLLM, Ollama, or similar gateway is introduced

## Practical maintenance checklist

Before merging a non-trivial change, verify all of the following:

- request contract unchanged or intentionally versioned
- no new tool exposure beyond approved scope
- validator invariants preserved
- path boundary logic preserved
- readiness semantics preserved
- golden tests pass
- kind Helm tests pass

## Final maintenance guidance

This codebase should be treated as a correctness system, not a convenience wrapper around a model API. The most important modules are the ones that restrict, validate, and verify. If a future change makes the system more flexible but less auditable, assume that change is probably wrong unless the design has been intentionally revised.
