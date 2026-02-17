# Task: 0005 — E2E Agent Tests

## Objective

Test agent interaction end-to-end with backend (local slot simulator or stub). Run when backend is available; skip or document when not.

## Acceptance Criteria

- E2E tests: create session, perform actions, assert on session state and results.
- Configurable run (e.g. bun test:e2e or env RUN_E2E=1); document how to run and skip when backend unavailable.
- All tests pass when backend is up.

## Dependencies

- Tasks 0001–0004; running backend (e.g. port 8080).

## Related

- phase-3.md 0005_e2e_tests; .cursor/rules/testing.mdc.
