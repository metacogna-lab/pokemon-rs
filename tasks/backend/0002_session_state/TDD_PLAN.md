# TDD Plan: 0002 Session State

## Units to Test

1. **State engine (pure)**
   - Valid transition Idle → Initialized returns Ok(Initialized).
   - Other valid transitions (e.g. Initialized → Probing, Playing → Evaluating → Completed) return Ok.
   - Invalid transition (e.g. Completed → Playing) returns Err(StateError::InvalidTransition).
   - No panic on any transition.

2. **Persistence**
   - Save session persists row; load by session_id returns same state and metrics.
   - Transition triggers persist (state and optionally audit log).

3. **Game session manager**
   - Create session returns session in Initialized state and persists.
   - Get session by id returns persisted session or NotFound.
   - Apply transition: valid transition updates state and persists; invalid returns error.

4. **API**
   - POST /v1/sessions with valid body returns 201 and CreateSessionResponse.
   - GET /v1/sessions/{id} returns 200 and Session or 404 with ErrorResponse.

## Integration Points

- controller/state_engine, controller/persistence_metrics, controller/game_session_manager.
- database/migrations applied in order: games → wallets → sessions (FK order).

## Mock Data

- CreateSessionRequest: valid game_id (UUID), player_profile with behavior_type.
- SessionId from create response used in GET.

## Expected Outputs

- All transitions persisted and logged; invalid transition returns error.
- Integration test with DB or in-memory store passes.
