# Task 0002 — Reward Signals

## Objective

Define reward shaping and persist signals per action using the formula from CLAUDE.md.

## Acceptance Criteria

- Reward formula: reward = (payout - stake) - operational_cost + human_likeness_score
- Rust compute_reward function with typed inputs
- Persist reward in Experience when writing to rl_store
- Unit tests for edge cases

## Dependencies

- 0001_rl_store complete

---

# TDD Plan — 0002 Reward Signals

## Units to test

1. **compute_reward**: Given (payout=10, stake=5, operational_cost=0.1, human_likeness=0.5) returns 10 - 5 - 0.1 + 0.5 = 5.4
2. **Zero payout**: payout=0, stake=5
3. **Negative stake**: Reject or handle explicitly
4. **Bounds**: human_likeness_score in [0, 1]; operational_cost >= 0

## Integration points

- Experience builder uses compute_reward when creating Experience from gameplay result

## Expected outputs

- compute_reward returns f64; no panic
- Reward calibration tests assert formula behavior
