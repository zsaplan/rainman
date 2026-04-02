# KBMD-QA v1.0

## 1. Objective

Define a markdown document standard optimized for a low-thinking retriever/querier agent that uses lexical navigation and line-based reads.

Design goals:
- minimize inference
- maximize retrieval precision
- maximize citation precision
- maximize determinism
- fail closed on ambiguity

Non-goals:
- narrative documentation quality
- human-friendly prose as primary objective
- broad exploratory knowledge capture

## 2. Core principles

1. One file = one answerable subject.
2. One section = one narrow question or rule.
3. One bullet or one source line = one atomic fact.
4. Critical facts must be locally self-contained.
5. Critical facts must repeat the full subject noun.
6. Headings must be semantically specific.
7. Aliases, acronyms, and identifiers must be explicit.
8. Exceptions must be explicit.
9. Conflicts must be explicit.
10. The file must expose likely question forms.

## 3. Required repository files

Required root files:
- `KB_INDEX.md`
- `GLOSSARY.md`
- `ALIASES.md`

Recommended domain indexes:
- `POLICY_INDEX.md`
- `RUNBOOK_INDEX.md`
- `SERVICE_INDEX.md`

## 4. File scope rules

A file must represent exactly one of:
- one policy
- one procedure
- one service capability
- one product limit
- one exception class
- one glossary concept

A file must not mix:
- multiple unrelated policies
- multiple unrelated procedures
- policy + changelog + meeting notes
- historical narrative + current authoritative rules in the same primary sections

## 5. File naming rules

Requirements:
- lowercase
- kebab-case
- stable path
- `.md` extension
- filename reflects canonical subject

Examples:
- `audit-log-retention.md`
- `token-rotation-exceptions.md`
- `batch-export-rate-limit.md`

## 6. Required file structure

Every file must follow this section order.

```md
# <Canonical Title>

> <1-2 sentence answer-first summary>

- doc_id: <stable-id>
- status: active | deprecated | draft
- owner: <team-or-role>
- last_reviewed: YYYY-MM-DD
- authoritative_for: <subject list>
- not_authoritative_for: <subject list>
- aliases: <comma-separated aliases>
- keywords: <comma-separated exact terms>

## Fast facts

- <atomic fact>
- <atomic fact>
- <atomic fact>

## Questions this document answers

- What is <x>?
- When does <x> apply?
- What are the exceptions to <x>?
- How do I perform <x>?

## Rules

### <specific rule title>
- Statement: <single atomic rule>
- Applies when: <condition>
- Does not apply when: <condition>
- Evidence class: normative | operational | informational

## Exceptions

### <specific exception title>
- Exception: <single atomic exception>
- Trigger: <condition>
- Effect: <change>

## Procedure

### <specific procedure title>
Preconditions:
- <precondition>

Steps:
1. <step>
2. <step>

Expected result:
- <result>

## Decision table

| if | then | unless | notes |
|---|---|---|---|
| <condition> | <result> | <exception> | <note> |

## Related documents

- [<canonical title>](./relative-path.md) - <relation>

## Optional appendix

<examples, history, non-authoritative detail>
```

## 7. Section requirements

### 7.1 `# <Canonical Title>`
Must be the unique canonical subject name.

### 7.2 Summary blockquote
Requirements:
- 1-2 sentences
- answer-first
- include the most important decisive fact
- use full subject nouns
- no vague qualifiers

### 7.3 Metadata list
Required keys:
- `doc_id`
- `status`
- `owner`
- `last_reviewed`
- `authoritative_for`
- `not_authoritative_for`
- `aliases`
- `keywords`

Rules:
- `doc_id` must be stable and unique
- `last_reviewed` must be ISO date
- `aliases` must include acronyms and historical names
- `keywords` must include exact identifiers, product names, error codes, plan names, environment names

### 7.4 `## Fast facts`
Requirements:
- 3-10 bullets
- each bullet atomic
- each bullet independently understandable
- each bullet contains full subject noun when critical

### 7.5 `## Questions this document answers`
Requirements:
- 3-8 likely user query forms
- use natural question phrasing
- include alias-based phrasing where useful
- include exception-focused phrasing where applicable

### 7.6 `## Rules`
Requirements:
- each `###` subsection covers one rule only
- each rule includes `Statement`, `Applies when`, `Does not apply when`
- normative statements must be explicit and unconditional unless a condition is declared

### 7.7 `## Exceptions`
Required when exceptions exist.

Rules:
- one subsection per exception
- each exception must name the trigger and the effect
- do not bury exceptions in prose

### 7.8 `## Procedure`
Required for procedural documents.

Rules:
- one action per step
- no multi-action steps
- expected result must be observable

### 7.9 `## Decision table`
Required when conditions materially change outcomes.

Rules:
- use only for matrix-like logic
- any decisive cell must also be restated in prose somewhere in the file

### 7.10 `## Related documents`
Requirements:
- link only canonical related files
- relation text must explain why the file is related

## 8. Atomic authoring rules

Required:
- one fact per bullet
- one sentence per source line for normative facts when practical
- semantic line breaks allowed and preferred
- repeat the full subject noun for decisive facts
- restate environment, scope, and time conditions explicitly

Prohibited:
- pronoun-only references for decisive facts
- long dense paragraphs for authoritative rules
- implicit inheritance from previous paragraphs
- hidden scope assumptions
- vague temporal language

## 9. Heading rules

Allowed:
- `## Audit log retention`
- `## Production retention`
- `## Token rotation exceptions`
- `## API rate limit for batch export`

Prohibited:
- `## Overview`
- `## Details`
- `## Notes`
- `## Misc`
- `## Other`

## 10. Lexical alignment rules

Each file must explicitly include:
- canonical term
- aliases
- acronyms
- old names
- exact identifiers
- relevant environment names
- exact product or component names

If a term is likely to be searched exactly, include it exactly.

Examples:
- error codes
- SKU names
- plan names
- API names
- feature flags
- service abbreviations

## 11. Numerical and temporal rules

Required:
- use exact numbers
- use exact units
- use exact dates where relevant
- use exact environment names
- use exact conditions

Examples:
- `90 days`
- `10 requests/second`
- `2026-04-01`
- `production`
- `staging`

Prohibited:
- `currently`
- `normally`
- `soon`
- `high volume`
- `large`
- `regular`

## 12. Conflict handling

If conflicting authoritative statements exist, the conflict must be explicit.

Required format:

```md
## Known conflicts

### <conflict title>
- Statement A: <text>
- Source A: <path>
- Statement B: <text>
- Source B: <path>
- Resolution status: unresolved | resolved
- Operational instruction: return conflict or insufficient_evidence until resolved.
```

Rules:
- unresolved conflict must not be hidden
- if conflict is unresolved, the file must not imply a single authoritative answer

## 13. Duplicate handling

A canonical fact should exist in one primary authoritative file.

Allowed duplication:
- short summaries in index files
- non-authoritative references in related files
- brief restatements for decision tables

Prohibited duplication:
- parallel authoritative copies of the same rule in multiple primary files without explicit ownership or cross-reference

## 14. Document types

### 14.1 Policy document
Required sections:
- Summary
- Metadata
- Fast facts
- Questions this document answers
- Rules
- Exceptions
- Decision table
- Related documents

### 14.2 Procedure document
Required sections:
- Summary
- Metadata
- Fast facts
- Questions this document answers
- Procedure
- Exceptions if applicable
- Related documents

### 14.3 Limit document
Required sections:
- Summary
- Metadata
- Fast facts
- Questions this document answers
- Rules
- Decision table if conditional
- Related documents

### 14.4 Glossary document
Required sections:
- Summary
- Metadata
- Fast facts
- Questions this document answers
- Rules only if semantic boundaries matter
- Related documents

## 15. Recommended size targets

Targets:
- one file should stay narrow
- one H2 section should usually stay within ~150-300 tokens
- avoid sections above ~500 tokens unless procedural or appendix content requires it

These are targets, not parser limits.

## 16. Validation rules

A compliant file must satisfy all of the following:
- valid markdown file
- required section order present
- required metadata keys present
- canonical title present
- answer-first summary present
- at least 3 fast facts
- at least 3 questions
- no prohibited vague headings
- no unresolved conflict hidden in prose if conflicting statements are known
- file path and filename meet conventions

## 17. Authoring lint rules

Lint errors:
- missing required section
- missing required metadata key
- vague heading
- no alias list
- no keyword list
- summary missing decisive fact
- decisive fact expressed only with pronouns
- critical fact buried only in table
- conflicting statements without `Known conflicts`

Lint warnings:
- section too long
- too many mixed concepts in one file
- duplicate likely exists
- excessive appendix content
- weak question coverage

## 18. Minimal template

```md
# <Canonical Title>

> <Most important answer-first statement.>

- doc_id: <stable-id>
- status: active
- owner: <team>
- last_reviewed: YYYY-MM-DD
- authoritative_for: <subject>
- not_authoritative_for: <subject>
- aliases: <alias-1>, <alias-2>
- keywords: <term-1>, <term-2>, <term-3>

## Fast facts

- <Subject> <fact>.
- <Subject> <fact>.
- <Subject> <fact>.

## Questions this document answers

- What is <x>?
- When does <x> apply?
- What are the exceptions to <x>?

## Rules

### <rule title>
- Statement: <rule>
- Applies when: <condition>
- Does not apply when: <condition>
- Evidence class: normative

## Exceptions

### <exception title>
- Exception: <exception>
- Trigger: <condition>
- Effect: <effect>

## Related documents

- [<title>](./relative-path.md) - <relation>
```

## 19. Minimal example

```md
# Audit log retention policy

> Audit log retention in production is 90 days. This file is authoritative for audit log retention and purge timing.

- doc_id: policy.audit-log-retention
- status: active
- owner: platform-security
- last_reviewed: 2026-04-01
- authoritative_for: audit log retention, purge timing
- not_authoritative_for: application debug logs, analytics events
- aliases: audit logs, security logs, compliance logs
- keywords: audit log retention, purge, TTL, production, staging

## Fast facts

- Audit log retention in production is 90 days.
- Audit log retention in staging is 14 days.
- Application debug logs are not governed by this policy.

## Questions this document answers

- What is the retention period for audit logs?
- Does the audit log retention period differ by environment?
- Are debug logs included in the audit log policy?

## Rules

### Production retention
- Statement: Audit log retention in production is 90 days.
- Applies when: the environment is production.
- Does not apply when: the log type is application debug logging.
- Evidence class: normative

### Staging retention
- Statement: Audit log retention in staging is 14 days.
- Applies when: the environment is staging.
- Does not apply when: the log type is application debug logging.
- Evidence class: normative

## Exceptions

### Legal hold
- Exception: Audit logs under legal hold are not purged on the standard schedule.
- Trigger: an active legal hold is recorded for the tenant or case.
- Effect: purge is suspended until the hold is released.

## Decision table

| if | then | unless | notes |
|---|---|---|---|
| environment = production | retain 90 days | legal hold active | authoritative |
| environment = staging | retain 14 days | legal hold active | authoritative |

## Related documents

- [Legal hold procedure](./legal-hold.md) - defines hold activation and release
- [Log classes](./log-classes.md) - defines audit log versus debug log
```
