# Task 0003 — Policy Export

## Objective

Enable export of experience data for offline Gymnasium training.

## Acceptance Criteria

- OpenAPI: GET /v1/rl/export with query params (session_id, limit, offset, format)
- Response: array of Experience-like records (state, action, reward, next_state, done)
- Gymnasium-compatible format: JSON array
- Export interface in controller reads from rl_store

## Dependencies

- 0001_rl_store, 0002_reward_signals complete

## Contracts Affected

- openapi.yaml (Experience schema, export path)
- controller/src/rl_feedback_loop/export.rs
- agents/ts-client (regenerate)
