# Notes: 0002 Session State

## Decisions

- State engine: flat GameState enum; transition() pure; StateError::InvalidTransition and NotFound. Persistence: InMemorySessionStore implements SessionRepository (async). Game session manager uses SessionRepository; create_session/get_session/transition_session. Migrations 0001 games, 0002 wallets, 0003 sessions (FK order). In-memory store used for tests and default serve.

## Blockers

- None.

## Edge Cases

- Get non-existent session → 404. Invalid transition → DomainError::InvalidTransition (maps to 409 STATE_ERROR when POST /sessions/{id}/action is added in Phase 2).
