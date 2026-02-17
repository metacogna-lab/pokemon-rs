# TDD Plan — 0004 Training Integration

## Units to test

1. **infer**: Given Observation, returns valid ActionProposal; no any
2. **Stub behavior**: infer returns Spin, PlaceBet, or CashOut (exhaustive)
3. **Training script**: Runs without error; can fetch export URL (smoke test)

## Integration points

- Orchestrator can call rl_model_runner.infer(obs) instead of planner
- Export script fetches from API; writes to file or passes to training

## Expected outputs

- infer returns ActionProposal; fully typed
- Training script documented and runnable
