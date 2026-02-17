# Task 0004 — Training Integration

## Objective

Hook backend RL store into a training pipeline; implement agents/rl_model_runner policy inference.

## Acceptance Criteria

- rl_model_runner: infer(observation) returns ActionProposal; uses generated TS types
- Stub: delegate to strategic_planner or random action until trained model exists
- Training pipeline script: calls GET /v1/rl/export, loads data; documented
- RL does not write session state

## Dependencies

- 0003_policy_export complete

## Contracts Affected

- agents/rl_model_runner/
- scripts/rl_export_train.py or equivalent
