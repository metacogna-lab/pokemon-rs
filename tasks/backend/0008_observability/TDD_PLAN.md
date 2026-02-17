# TDD Plan — 0008 Observability

## Units to test

1. **Metric recording**: Record a counter or histogram; assert value in test harness or in-memory exporter.
2. **Structured span**: Enter span with session_id/request_id; assert log event contains structured fields (no PII).
3. **Latency**: Middleware or wrapper records request duration; assert metric present after one request.

## Integration points

- Request middleware creates span and records latency.
- Session state transitions emit counter increments (e.g. session_created, session_completed).

## Mock data

- Single HTTP request; session create and one action.

## Expected outputs

- Unit: record_session_created() increments counter; get_counter() returns expected value.
- Integration: one GET /health or POST session; assert one latency observation and one log line with request_id.
