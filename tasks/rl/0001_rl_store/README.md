# Task 0001 — RL Store (Experience Replay Buffer)

## Objective

Implement experience replay buffer schema and storage logic so that gameplay events can be captured for reinforcement learning.

## Acceptance Criteria

- Rust Experience struct matches DATASTORE 2.5: id, session_id, state (JSONB), action (JSONB), reward, next_state (JSONB), done
- ExperienceStore trait with insert_experience
- In-memory mock implementation for unit tests
- Unit and integration tests pass

## Dependencies

- DB migration 0005 (rl_store table) applied
- controller rl_feedback_loop module exists
