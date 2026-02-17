# Task 0008 — Observability

## Objective

Add structured logging, metrics, and tracing so the backend is observable in production.

## Acceptance criteria

- Structured logging (e.g. tracing crate) with request_id, session_id, state, error codes; no raw PII.
- Metrics: API latency per route, DB throughput (queries/sec or pool), session lifecycle counters (created, completed, by state).
- Optional tracing span for request flow (session create → action → persist); respect 1ms hot-path budget where applicable.

## Contracts affected

- Rust: tracing, metrics crate (e.g. prometheus or metrics); no API contract change.

## Related API endpoints

- All routes instrumented; metrics exported (e.g. /metrics) or logged for collection.
