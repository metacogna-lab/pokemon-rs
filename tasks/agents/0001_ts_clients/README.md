# Task: 0001 — TS Client Bindings

## Objective

Generate and validate the TypeScript HTTP client from the OpenAPI spec so agents use typed API contracts with no manual models.

## Acceptance Criteria

- [ ] `agents/ts-client/` is generated from `openapi.yaml` via openapi-generator-cli (typescript-fetch).
- [ ] Regeneration is repeatable and documented (CLAUDE.md / README).
- [ ] Type conformity: no `any` for API request/response types; generated models match backend domain (Session, Wallet, GameplayAction, etc.).
- [ ] Unit tests instantiate generated client and key models; tests pass against mocks.
- [ ] Coverage for client usage meets project threshold (see `.cursor/rules/testing.mdc`).

## Dependencies

- `openapi.yaml` (canonical API contract v1.0.0)
- Backend domain types reflected in OpenAPI (see `.agents/CONTRACTS.md`)

## Contracts Affected

- All request/response shapes in `openapi.yaml`
- `agents/ts-client/` (generated; do not edit by hand)

## Related

- AGENTS.md Stage 1 — Client bindings & type safety
- CLAUDE.md "TS client generation"
- tasks/agents/agents.mdc deliverable: 0001_ts_clients
