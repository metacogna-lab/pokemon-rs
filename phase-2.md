# Phase 2 — Backend Gameplay and Platform

Add gameplay event persistence, fingerprinting engine, API contracts automation, security/auth, and observability so the backend supports full session flows and downstream agents/RL.

## Objective

Deliver event store and fingerprinter for sessions, plus API versioning/codegen, auth guardrails, and structured logging/metrics. OpenAPI and DATASTORE stay the single source of truth; migrations and contract validation tests in place.

## Dependencies

- **Phase 1 complete**: Server skeleton, session state machine, and wallet controls must be implemented and passing tests.

## Entry criteria

- Phase 1 exit criteria satisfied (backend 0001–0003 done).
- `controller` state engine and `game_session_manager` working with DB.
- OpenAPI spec and Rust handlers aligned for existing endpoints.

## Atomic tasks (in order)

| # | Task ID | Folder | Objective | Key deliverables |
|---|---------|--------|-----------|------------------|
| 1 | 0004_gameplay_events | `tasks/backend/0004_gameplay_events/` | Persist action and result records for every session. | Event schema; consumer/projection pipelines; indexing strategies. |
| 2 | 0005_fingerprinter | `tasks/backend/0005_fingerprinter/` | Implement game fingerprint extraction logic. | RNG signature extraction; symbol mapping; statistical profile generation; storage and lookup API. |
| 3 | 0006_api_contracts | `tasks/backend/0006_api_contracts/` | Maintain OpenAPI spec and generate clients automatically. | API versioning strategy; codegen automation; contract validation tests. |
| 4 | 0007_security | `tasks/backend/0007_security/` | Implement auth guardrails, RBAC, rate limits. | Token validation; role enforcement; logging unauthorized access. |
| 5 | 0008_observability | `tasks/backend/0008_observability/` | Add structured logs, metrics, tracing. | API latency; DB throughput; session lifecycle stats. |

Implement in order: 0004 → 0005 → 0006 → 0007 → 0008. Events and fingerprinter enable gameplay analytics; contracts and security/observability harden the platform.

## Contract and schema updates

Per [tasks/INSTRUCTIONS.md](tasks/INSTRUCTIONS.md) Phase 3:

- Add/update paths and schemas in `openapi.yaml` for new endpoints.
- Add migrations and update `.agents/DATASTORE.md` for new tables/columns.
- Regenerate clients after spec changes; validate Rust/TS bindings with tests.

## Exit criteria and quality gates

- Each backend task 0004–0008 has a valid `.mdc` and meets its entry bounds (backend.mdc).
- **TDD**: All new code covered by unit and integration tests.
- **Contract validation**: Contract validation tests pass; codegen runs clean from `openapi.yaml`.
- **Migrations**: DB schema in sync with DATASTORE; migrations applied and tested.
- **Rust**: `cargo test --workspace` and `cargo clippy --workspace` pass; controller coverage target maintained.
- **Documentation**: ARCHITECTURE.md, CONTRACTS.md, DATASTORE.md updated for new behavior (post-merge per INSTRUCTIONS).

## References

- [CLAUDE.md](CLAUDE.md) — Phase 2 (backend/0004, 0005); workspace layout; type flow.
- [.cursor/rules/backend.mdc](.cursor/rules/backend.mdc) — Deliverables 0004–0008, OpenAPI adherence.
- [tasks/PRD.md](tasks/PRD.md) — Sections 2.4–2.8 (Gameplay events, Fingerprinting, API contracts, Security, Observability).
- [tasks/INSTRUCTIONS.md](tasks/INSTRUCTIONS.md) — Phase 3 (API/contract integration), migrations, doc updates.
