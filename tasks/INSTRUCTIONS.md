IMPLEMENTATION_WORKFLOW.md
Purpose

Provide a standard workflow for implementing new features, ensuring:

Phased rollout

Feature branch isolation

Test-Driven Development

Frequent commits

Peer review

Safe merges to main

Task state evolution in tasks/

This applies to both backend (Rust) and agent clients (TS).

Phase 0 — Preparation
📌 0.1 Define the Feature

Imperative:

Create a new entry in tasks/ (e.g., tasks/0008_fingerprint_engine/README.md)

Include:

Feature name + ID

Objectives

Acceptance Criteria

Contracts affected

Related API endpoints

Example header:

# Task: 0008 — Fingerprint Engine
## Objective
Implement deterministic/statistical game fingerprint extraction.
## Acceptance Criteria
- Must pass integration tests
- Must store JSONB profile
- Must surface API route

📌 0.2 Create Feature Branch

Imperative:
Branch naming MUST follow:

feature/{task-number}-{short-name}


Example:

git checkout -b feature/0008-fingerprint-engine

Phase 1 — Test Planning & Setup
📌 1.1 Write TDD Plan

Imperative:

In the tasks/0008_fingerprint_engine/ folder add a TDD_PLAN.md

It must outline:

Units to test

Integration points

Mock data

Expected outputs

Example sections:

### Units
- RNG signature extraction
- Symbol frequency

Phase 2 — Implement Core Logic With Tests
📌 2.1 Write Tests First

Imperative:

Write failing tests before writing implementation.

Use the project test framework:

Rust: cargo test

TS: npm test

Example tests:

assert_eq!(fingerprint.symbol_map.len(), expected);

📌 2.2 Implement Minimal Code to Pass Tests

Imperative:

Add minimal implementation to make tests pass

Do not add unused functions or helpers

Ensure all new types are fully typed, no unwrap() without safe guards

📌 2.3 Commit Early and Often

Imperative:

Every logically complete unit (e.g., util function, API handler) must be committed with a clear commit message:

Format:

feat: {short description}

- Related task: {task-number}


Example:

feat: add RNG signature extraction
- Related task: 0008

Phase 3 — API/Contract Integration
📌 3.1 Update OpenAPI & DataStore If Needed

Imperative:

Add new paths/schemas to openapi.yaml

Add new tables/columns to migrations

Update DATASTORE.md with entity changes

These MUST be reflected in tests.

📌 3.2 Regenerate Clients

Imperative:

Run:

openapi-generator-cli generate


Validate TS/Rust bindings reflect new contracts

Add tests that instantiate these models

Phase 4 — Integration & E2E Testing
📌 4.1 Add Backend Integration Tests

Imperative:

Use a test database

Write tests for:

API success pathways

Invalid inputs

State transitions

Examples:

assert response.state == Playing

📌 4.2 Add Agent Client Tests

Imperative:

Add TS tests for the generated client

Mock backend responses

Validate API renders correct objects

Phase 5 — Peer Review & Code Quality
📌 5.1 Create Pull Request

Imperative:

Open PR against main

Title:

feat(task-0008): implement fingerprint engine


Description:

Link related tasks

Link test coverage

Include checklist

Example checklist:

- [x] Unit tests passed
- [x] Integration tests passed
- [x] Contracts updated

📌 5.2 Enforce Reviews

Imperative:

At least two approvals

Must address feedback

Triaged bug fixes go back on branch

Phase 6 — Merge & Release
📌 6.1 Merge

Imperative:

Only merge after:

Passing CI

Green code coverage

Signed off by reviewers

📌 6.2 Tag & Release

Imperative:

Tag commit:

git tag -a v{major.minor.patch} -m "task-0008 fingerprint engine"


Push tags

Phase 7 — Post-Merge Tasks
📌 7.1 Update Documentation

Imperative:

Update:

ARCHITECTURE.md

CONTRACTS.md

DATASTORE.md

Backend/CLI READMEs

Ensure it reflects final implemented behavior.

📌 7.2 Migration & Deployment

Imperative:

Apply new migrations

Ensure DB schema sync

Smoke test the deployment

Phase 8 — Evolving Task State

Each task must maintain:

tasks/
├── 0008_fingerprint_engine/
│   ├── README.md
│   ├── TDD_PLAN.md
│   ├── TESTS/
│   │   └── fingerprint_tests.rs
│   └── NOTES.md


Imperative:

Update NOTES.md with:

blockers

decisions

discovered edge cases

Policies (Mandatory)
📌 Policy: Always TDD

No feature code without tests is accepted.

If test infrastructure is missing for a language/environment, first create it.

📌 Policy: Feature Branch Isolation

Never work directly on main.

All work must be in feature/....

Workflow Summary (Checklist)

For every feature:

☐ Create task folder + docs
☐ Branch off main
☐ Write tests
☐ Implement code
☐ Commit early/often
☐ Update contracts/migrations
☐ Add integration tests
☐ Submit PR
☐ Get two approvals
☐ Merge + tag
☐ Update docs
