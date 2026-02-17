# Phase 3 — Agents

Implement the TypeScript agent stack: generated client, observation layer, planner, behavior profiles, orchestrator, and e2e tests. Agents are stateless against the DB; all reads/writes go through the backend API.

## Objective

Deliver a type-safe agent layer that drives autonomous gameplay using the OpenAPI-generated TS client. Observation → Planner → ActionProposal with exhaustive handling; behavioral profiles and orchestrator with retries and circuit breakers; full test coverage (unit, integration, e2e).

## Dependencies

- **Phase 1 and Phase 2 complete**: Backend API, session state machine, wallet, events, fingerprinter, and OpenAPI contract (and codegen) in place.
- TS client bindings are generated from `openapi.yaml` (Phase 2 task 0006).

## Entry criteria

- Backend API and state machine working (Phases 1–2).
- `openapi.yaml` reflects current API; `agents/ts-client/` can be generated.
- TypeScript agent code and TS client bindings exist (per [.cursor/rules/testing.mdc](.cursor/rules/testing.mdc)).

## Atomic tasks (in order)

Aligned with [AGENTS.md](AGENTS.md) Stages 1–5 and [tasks/agents/agents.mdc](tasks/agents/agents.mdc):

| # | Task ID | AGENTS stage | Folder | Objective | Key deliverables |
|---|---------|--------------|--------|-----------|------------------|
| 1 | 0001_ts_clients | Stage 1 — Client bindings & type safety | `tasks/agents/0001_ts_clients/` | Generate and validate TS HTTP client from OpenAPI. | Regenerate on spec changes; validate type conformity; test against mocks; no `any`; fully typed payloads. |
| 2 | (observation) | Stage 2 — Observation layer | `agents/strategic_planner/observation.ts` | Typed abstraction over raw API responses. | `Observation` type (session, result?, metrics) using generated `SessionModel`, `GameplayResultModel`, `SessionMetricsModel`. |
| 3 | 0002_planner | Stage 3 — Planner & action proposal | `tasks/agents/0002_planner/` | Planner that takes Observation and outputs ActionProposal. | Observation→Action mappings; `ActionProposal` union (e.g. PlaceBet \| Spin \| CashOut); exhaustive handling; no unsafe constructs. |
| 4 | 0003_behavior_profiles | Stage 4 — Behavioral profiles | `tasks/agents/0003_behavior_profiles/` | Simulate human play: delays, stake variation, session breaks. | `conservative`, `aggressive`, `mixed_adaptive` profiles; fully typed and unit-tested. |
| 5 | 0004_orchestrator | Stage 5 — Orchestrator & workflow | `tasks/agents/0004_orchestrator/` | Manage agent runs, retries, state progression. | Session start → spin → result retrieval; scheduling with time delays; error handling and retries; circuit breakers; coordination with RL feedback. |
| 6 | 0005_e2e_tests | — | `tasks/agents/0005_e2e_tests/` | Test agent interaction end-to-end with backend. | E2E tests against backend stubs/mocks; full agent ↔ backend integration. |

Implement in order: 0001 → observation layer → 0002 → 0003 → 0004 → 0005. Agents must use generated client only; no manual API models for OpenAPI types ([AGENTS.md](AGENTS.md)).

## Error handling (reference)

From [CLAUDE.md](CLAUDE.md): handle `WALLET_LIMIT_EXCEEDED` without retrying indefinitely. All API errors: `{ "error": { "code", "message", "details" } }`; standard codes include `INVALID_INPUT`, `NOT_FOUND`, `STATE_ERROR`, `RATE_LIMIT`, `INTERNAL_ERROR`, `UNAUTHORIZED`.

## Exit criteria and quality gates

From [.cursor/rules/testing.mdc](.cursor/rules/testing.mdc):

- **Unit tests**: Required. Models, planners, behavior profiles, and utilities unit-tested with robust assertions. Coverage ≥ 80% (coverage_threshold).
- **Integration tests**: Required. Agents tested against mock backend (mock TS client); verify workflows: create session, make move, observe result.
- **E2E tests**: Required. Full agent ↔ backend integration with real API responses (e.g. local slot simulator).
- **Quality gates**: All tests pass; coverage ≥ 80%; no ignored tests.
- **Failure handling**: On failure, block merge; list failures in task README; update agent logic.
- **Type safety**: No `any`; exhaustive handling of `ActionProposal` union ([AGENTS.md](AGENTS.md)).
- **Rust/TS**: `cargo test --workspace` and `bun test` pass before commit ([CLAUDE.md](CLAUDE.md)).

## References

- [AGENTS.md](AGENTS.md) — Rust→TS flow; Stages 1–5 (client, observation, planner, profiles, orchestrator); type safety.
- [CLAUDE.md](CLAUDE.md) — Phase 3 task order; agent architecture table; error contract; human-like behaviour; testing standards.
- [.cursor/rules/testing.mdc](.cursor/rules/testing.mdc) — Test types, coverage threshold, quality gates, failure handling.
- [tasks/agents/agents.mdc](tasks/agents/agents.mdc) — Deliverables 0001–0005; coordinate with backend mocks; TS client conforms to OpenAPI.
- [tasks/PRD.md](tasks/PRD.md) — Sections 3.1–3.5 (TS clients, planner, behavior profiles, orchestrator, e2e tests).
