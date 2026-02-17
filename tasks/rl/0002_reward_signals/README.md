# Task 0002 — Reward Signals

## Objective

Define reward shaping and persist signals per action using the formula from CLAUDE.md.

## Acceptance Criteria

- Reward formula: reward = (payout - stake) - operational_cost + human_likeness_score
- Rust compute_reward function with typed inputs
- Persist reward in Experience when writing to rl_store
- Unit tests for edge cases (zero payout, negative stake, bounds)

## Dependencies

- 0001_rl_store complete

## Contracts Affected

- controller/src/rl_feedback_loop/reward.rs
