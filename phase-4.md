# Phase 4 — Reinforcement Learning

Implement the RL feedback loop: experience store, reward signals, policy export, training integration, and evaluation metrics. RL does not write authoritative session state; the backend remains the source of truth.

## Objective

Capture gameplay experience (state, action, reward, next_state, done) per event, apply a human-likeness-aware reward formula, expose data for offline Gymnasium training, and hook the RL store into a training pipeline with defined success metrics.

## Dependencies

- **Phases 1–3 complete**: Backend API, session state machine, wallet, events, fingerprinter, and TS agent orchestrator working end-to-end. Do not implement RL until then ([CLAUDE.md](CLAUDE.md)).

## Entry criteria

- Backend and agents (Phases 1–3) complete and tested.
- Agent orchestrator can run sessions and observe outcomes.
- `controller/src/rl_feedback_loop/` (or equivalent) ready for Experience storage; DB supports `rl_store` (or planned schema).

## Atomic tasks (in order)

| # | Task ID | Folder | Objective | Key deliverables |
|---|---------|--------|-----------|------------------|
| 1 | 0001_rl_store | `tasks/rl/0001_rl_store/` | Implement experience replay buffer schema. | Store for Experience records (state, action, reward, next_state, done) per gameplay event; DB table/schema. |
| 2 | 0002_reward_signals | `tasks/rl/0002_reward_signals/` | Define reward shaping and store signals per action. | Reward formula: `reward = (payout - stake) - operational_cost + human_likeness_score`; persist signals. |
| 3 | 0003_policy_export | `tasks/rl/0003_policy_export/` | Enable export of experience data for offline training. | Export from `rl_store` for Gymnasium-compatible offline training; interfaces for export. |
| 4 | 0004_train_integration | `tasks/rl/0004_train_integration/` | Hook backend RL store into a training pipeline. | Integration with Python or TS training pipeline; `agents/rl_model_runner/` policy inference against observation space. |
| 5 | 0005_rl_metrics | `tasks/rl/0005_rl_metrics/` | Define success metrics for RL policies and evaluate. | Evaluation metrics and convergence criteria; validation of reward calibration. |

Implement in order: 0001 → 0002 → 0003 → 0004 → 0005. Store and reward logic first; then export and training integration; finally metrics and evaluation.

## RL constraints (reference)

From [CLAUDE.md](CLAUDE.md):

- `controller/src/rl_feedback_loop/` stores `Experience` records per gameplay event.
- Reward: `reward = (payout - stake) - operational_cost + human_likeness_score` (human-likeness is rewarded, not raw payout).
- `agents/rl_model_runner/` runs policy inference against the observation space.
- Experience data exported from DB `rl_store` for offline Gymnasium training.
- RL training does **not** write authoritative session state — backend remains source of truth.

## Exit criteria and quality gates

- All RL sub-folders have valid `.mdc` files and validate (per [tasks/rl/rl.mdc](tasks/rl/rl.mdc)).
- **Reward calibration**: Reward logic and calibration validated by tests ([rl.mdc](tasks/rl/rl.mdc)).
- **Export**: RL data is exportable for offline training; export interfaces tested.
- **TDD**: New code covered by unit and integration tests where applicable.
- **Documentation**: ARCHITECTURE.md, DATASTORE.md (or .agents docs) updated for RL store and pipelines.

## References

- [CLAUDE.md](CLAUDE.md) — Reinforcement Learning section; Phase 4 task order; reward formula; rl_feedback_loop; backend as source of truth.
- [tasks/rl/rl.mdc](tasks/rl/rl.mdc) — RL task group root; deliverables 0001–0005; reward calibration and export requirements.
- [tasks/PRD.md](tasks/PRD.md) — Sections 4.1–4.5 (RL store, reward signals, policy export, train integration, rl_metrics).
