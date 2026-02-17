# TDD Plan — 0004 Gameplay Events

## Units to test

1. **Event mapping (Rust → row)**: Given a `GameplayEvent` struct, serialize to JSONB for action/result; assert event_id and session_id are set; timestamp default or explicit.
2. **Validation**: Reject event insert when session_id is missing or invalid; reject when action/result shape does not match OpenAPI (e.g. action.type in [PlaceBet, Spin, CashOut]).
3. **List by session**: Given N events for session S, list_events(session_id) returns N events in timestamp order; optional limit/offset or time range.

## Integration points

- After state engine applies a gameplay action, persistence layer inserts one row into `gameplay_events`.
- GET /sessions/{id}/events calls list_events and returns JSON array of events.

## Mock data

- Minimal action: `{ "type": "Spin" }`.
- Minimal result: `{ "payout": null, "symbols": ["A","B","C"] }`.
- Full action with amount: `{ "type": "PlaceBet", "amount": { "amount": 10, "currency": "AUD" } }`.

## Expected outputs

- insert_event returns Ok(()) or Err with no panic.
- list_events returns Vec<GameplayEvent>; empty vec for unknown session or no events.
- Integration: create session → post action → get events → assert one event with matching action/result.
