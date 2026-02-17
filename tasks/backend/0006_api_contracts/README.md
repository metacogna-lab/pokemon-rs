# Task 0006 — API Contracts

## Objective

Maintain OpenAPI as single source of truth: versioning strategy, codegen automation, and contract validation tests.

## Acceptance criteria

- API versioning documented (e.g. /v1/ prefix; no breaking change without new version).
- Script or CI step runs openapi-generator-cli to generate TS client into agents/ts-client/.
- Contract tests: load openapi.yaml; assert critical paths and schemas (sessions, gameplay, wallet, error); generated TS types compile and match minimal request/response.

## Contracts affected

- openapi.yaml — canonical spec.
- agents/ts-client/ — generated; do not edit by hand.
- Optional: Rust server/types from same spec if used.

## Related API endpoints

- All paths in openapi.yaml; tests assert required paths and schema shapes.
