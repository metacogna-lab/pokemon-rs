# TDD Plan — 0005 RL Metrics

## Units to test

1. **mean_reward**: Given list of experiences, returns correct mean
2. **episode_length**: Count experiences per session until done=true
3. **reward_variance**: Variance over sliding window
4. **Reward calibration**: human_likeness dominates when payout neutral; formula invariants

## Expected outputs

- Metric functions return correct values
- Calibration tests pass per rl.mdc
