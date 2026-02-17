# Task: 0004 — Orchestrator and Workflow

## Objective

Manage agent runs: session lifecycle, retries with backoff, circuit breaker. Handle WALLET_LIMIT_EXCEEDED without infinite retries.

## Acceptance Criteria

- Orchestrator uses generated client only; Observation from responses; planner and profile.
- Retries with backoff for transient errors; circuit breaker after N failures.
- WALLET_LIMIT_EXCEEDED handled without infinite retries.
- Integration tests with mock client.

## Dependencies

Tasks 0001–0003; ts-client, observation, planner, profiles.
