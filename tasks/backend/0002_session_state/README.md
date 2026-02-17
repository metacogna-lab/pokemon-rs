# Task: 0002 — Session State Machine and Persistence

## Objective

Implement session state machine (Idle to Initialized to Completed) as pure functions in state_engine; persist sessions and emit audit-style logs; invalid transitions return StateError::InvalidTransition (no panic).

## Acceptance Criteria

- [ ] State engine: GameState enum matching OpenAPI; StateError::InvalidTransition; pure transition functions returning Result.
- [ ] Persistence: session row and optional audit log; schema per DATASTORE.md and migrations.
- [ ] Game session manager: create session, get by id, apply transition (validate then persist and log).
- [ ] POST /v1/sessions and GET /v1/sessions/{sessionId} wired; request/response types from OpenAPI.
- [ ] Invalid transition returns 409 with ErrorResponse code STATE_ERROR.
- [ ] Integration test: game_session_manager wired to DB or in-memory; transitions persisted.
- [ ] cargo test and cargo clippy pass.

## Dependencies

- 0001_server_skeleton. openapi.yaml, DATASTORE.md, database migrations.

## Related

- phase-1.md, CLAUDE.md state machine and persistence_metrics.
