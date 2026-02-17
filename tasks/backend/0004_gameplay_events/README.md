# Task 0004 — Gameplay Events

## Objective

Persist action and result records for every session so that gameplay history is queryable and can feed fingerprinting and RL.

## Acceptance criteria

- Event schema matches DATASTORE §2.4: event_id, session_id, action JSONB, result JSONB, timestamp, reward.
- Every gameplay action (PlaceBet, Spin, CashOut) results in a persisted event row.
- Read path: list events by session_id (and optionally time range).
- Indexes on session_id and timestamp for temporal querying.
- Unit and integration tests pass; no unwrap() in hot path.

## Contracts affected

- OpenAPI: `GameplayAction`, `GameplayResult`; add GET `/v1/sessions/{sessionId}/events` if not present.
- DATASTORE: §2.4 Gameplay Event; §3.2 JSONB; §4.1 Backend writes to Gameplay Event.
- Rust: controller `persistence_metrics` or `event_store` module.

## Related API endpoints

- POST `/v1/sessions/{id}/action` — must persist event after applying action.
- GET `/v1/sessions/{id}/events` — return paginated/list of events for session.
