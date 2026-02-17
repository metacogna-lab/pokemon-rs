# Phase 1 — Backend Foundation

Establish the server skeleton, session state machine, and wallet controls so the backend can serve API requests and enforce financial guardrails.

## Objective

Deliver a runnable backend (CLI `serve`) with session lifecycle, pure-fn state transitions, and wallet debit/credit under limits. All transitions persisted and logged; invalid transitions return `StateError::InvalidTransition` (no panic).

## Dependencies

- None (first phase). Requires `tasks/` directory and repo layout per [CLAUDE.md](CLAUDE.md).

## Entry criteria

- `tasks/backend/` directory exists (per [.cursor/rules/backend.mdc](.cursor/rules/backend.mdc)).
- OpenAPI spec (`openapi.yaml`) present for contract alignment.
- Rust workspace builds: `cargo build --workspace`.

## Atomic tasks (in order)

| # | Task ID | Folder | Objective | Key deliverables |
|---|---------|--------|-----------|------------------|
| 1 | 0001_server_skeleton | `tasks/backend/0001_server_skeleton/` | Generate server from OpenAPI and wire core scaffolding. | Handler traits, logging, auth middleware, base request/response types. |
| 2 | 0002_session_state | `tasks/backend/0002_session_state/` | Implement session state machine and persistence. | Idle → Initialized → Playing transitions; DB persistence; audit log triggers. |
| 3 | 0003_wallet_controls | `tasks/backend/0003_wallet_controls/` | Implement wallet logic with rate/cost limits. | Debit/credit with limits; persist and rollback on failure; cost fee enforcement. |

Implement in order: 0001 → 0002 → 0003. Session state depends on server skeleton; wallet is required before any gameplay.

## State machine (reference)

From [CLAUDE.md](CLAUDE.md): transitions live in `controller/src/state_engine/` as pure functions returning `Result<GameState>`:

```
Idle → Initialized → Probing → Playing → Evaluating → Completed
```

- Every transition: persist via `persistence_metrics`, emit structured log event.
- Invalid transition: return `StateError::InvalidTransition` — never panic.

## Financial guardrails (reference)

From [CLAUDE.md](CLAUDE.md): controller enforces balance ≥ bet, daily spend limit, per-spin/query fees. Violations return error code `WALLET_LIMIT_EXCEEDED`.

## Exit criteria and quality gates

- Each backend task folder has a valid `.mdc` and meets its entry bounds (backend.mdc).
- **TDD**: Tests written before implementation; no feature code without tests.
- **Integration tests**: `game_session_manager` wired against DB; state transitions and wallet flows covered.
- **OpenAPI adherence**: Handlers and types align to `openapi.yaml`.
- **Rust**: `cargo test --workspace` and `cargo clippy --workspace` pass; target ≥ 80% coverage on `controller` (CLAUDE.md).
- **Documentation**: Update `tasks/<task>/NOTES.md` with blockers, decisions, edge cases (per [tasks/INSTRUCTIONS.md](tasks/INSTRUCTIONS.md)).

## References

- [CLAUDE.md](CLAUDE.md) — Workspace layout, state machine, financial guardrails, task sequencing.
- [.cursor/rules/backend.mdc](.cursor/rules/backend.mdc) — Backend deliverables 0001–0003, strict OpenAPI adherence.
- [tasks/PRD.md](tasks/PRD.md) — Sections 2.1–2.3 (Server foundation, Session core, Wallet & financial controls).
