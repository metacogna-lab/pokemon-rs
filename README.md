# pokemon-rs

High-level gaming fingerprinting system: CLI (Rust), TypeScript agents, game-engine targets, and database layer.

## Layout

```
pokemon-rs/
├── CLI (Rust)
│   └── cli/                    # CLI binary
│   └── controller/            # Controller (Rust)
│       ├── game_session_manager/
│       ├── state_engine/
│       ├── simulator_human_proxy/
│       ├── fingerprinter/
│       ├── rl_feedback_loop/
│       └── persistence_metrics/
├── TypeScript Agents
│   └── ts-agents/
│       ├── strategic_planner/
│       ├── rl_model_runner/
│       └── game_interaction_orchestrator/
├── Game Engine Targets
│   └── game_engine_targets/
│       └── slot_game_api_simulator/
└── Database systems
    └── database/
        ├── migrations/
        ├── schema/
        └── connectors/
```

## Commands

- **Rust:** `cargo build --workspace` from repo root.
- **TypeScript:** `bun install` and run each agent from its directory under `ts-agents/`.
