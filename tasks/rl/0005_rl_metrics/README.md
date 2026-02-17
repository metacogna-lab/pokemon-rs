# Task 0005 — RL Metrics

## Objective

Define success metrics for RL policies; validate reward calibration; update documentation.

## Acceptance Criteria

- Evaluation metrics: mean_reward, episode_length, reward variance
- Reward calibration tests assert formula behavior
- ARCHITECTURE.md, DATASTORE.md updated for RL store and pipelines

## Dependencies

- 0004_train_integration complete

## Contracts Affected

- controller/src/rl_feedback_loop/metrics.rs or agents/rl_model_runner/metrics.ts
- .agents/ARCHITECTURE.md, .agents/DATASTORE.md
