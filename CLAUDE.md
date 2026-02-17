# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`pokemon-rs` is an autonomous slot machine gameplay and fingerprinting system. The goal is to simulate human-like play behaviour, extract statistical game profiles, and — after the core system is stable — feed experience data into a Gymnasium-compatible RL training loop. Development is **phased**: backend → agents → RL.

## Workspace Layout

```
pokemon-rs/
├── Cargo.toml                  # Workspace root (members: cli, controller)
├── cli/                        # Binary crate — CLI client to the backend API
│   └── src/main.rs
├── controller/                 # Library crate — all backend business logic
│   └── src/
│       ├── lib.rs
│       ├── game_session_manager/   # Session CRUD and lifecycle
│       ├── state_engine/           # Pure-fn state machine (Idle→Completed)
│       ├── simulator_human_proxy/  # Human-like timing/bet variation
│       ├── fingerprinter/          # RNG signature + statistical profiling
│       ├── rl_feedback_loop/       # Reward signal capture and experience buffer
│       └── persistence_metrics/    # DB access layer + metrics emission
├── agents/                     # TypeScript agents (bun workspace)
│   ├── package.json            # Workspace root for TS agents
│   ├── tsconfig.json           # Strict, ESNext, bundler resolution
│   ├── strategic_planner/      # Observation → ActionProposal logic
│   ├── rl_model_runner/        # Policy inference (stub until Phase 4)
│   ├── game_interaction_orchestrator/  # Session lifecycle, retries, scheduling
│   └── ts-client/              # GENERATED — OpenAPI typescript-fetch client
├── game_engine_targets/
│   └── slot_game_api_simulator/    # Mock slot engine for local dev/testing
├── database/
│   ├── schema/                 # SQL schema per DATASTORE.md
│   └── migrations/
├── openapi.yaml                # Canonical API contract (v1.0.0)
└── .agents/
    ├── ARCHITECTURE.md         # System overview + data models
    ├── CONTRACTS.md            # Rust types → OpenAPI → TS interfaces
    ├── DATASTORE.md            # DB schema, entity relationships
    ├── PRD_BACKEND.md          # Backend product requirements
    └── PRD_CLI.md              # CLI product requirements
```

## Commands

### Rust (from repo root)
```bash
cargo build --workspace          # Build cli + controller
cargo test --workspace           # Run all Rust tests
cargo test -p controller         # Test controller only
cargo run -p cli                 # Run CLI binary
cargo clippy --workspace         # Lint
```

### TypeScript agents (from `agents/`)
```bash
bun install                      # Install deps (bun.lock committed)
bun run lint                     # eslint check
bun test                         # Run all agent tests
bun run agents/rl_model_runner/index.ts  # Run individual agent
```

### TS client generation (from repo root)
```bash
# Regenerate agents/ts-client from openapi.yaml after any API change
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./agents/ts-client \
  --additional-properties=supportsES6=true
```

### Local dev server
```bash
# Backend API (port 8080 per openapi.yaml)
cargo run -p cli -- serve        # once server handler is wired

# Slot simulator target
cargo run -p slot_game_api_simulator
```

## Architecture: Type Flow

**Rust types → OpenAPI → TypeScript** is the single source of truth chain. Never write manual TS models for backend types.

```
controller/src/  (Rust structs/enums)
    ↓  serialize via serde
openapi.yaml  (hand-maintained or generated)
    ↓  openapi-generator-cli
agents/ts-client/  (auto-generated — do not edit)
    ↓  import
agents/strategic_planner, rl_model_runner, game_interaction_orchestrator
```

## State Machine

All session transitions live in `controller/src/state_engine/`. Transitions are pure functions returning `Result<GameState>`. The canonical machine:

```
Idle → Initialized → Probing → Playing → Evaluating → Completed
```

Every state transition must be persisted (via `persistence_metrics`) and emitted as a structured log event. Invalid transitions return `StateError::InvalidTransition` — never panic.

## Human-Like Behaviour Layer

`simulator_human_proxy` in the controller and `strategic_planner`/`game_interaction_orchestrator` in agents together simulate human play. Key concerns:

- Variable inter-spin delays (gaussian jitter around a target cadence)
- Stake variation across sessions (`conservative`, `aggressive`, `mixed_adaptive` profiles)
- Session break simulation
- Behaviour profiles are fully typed and unit-tested on the TS side

This layer is what gets rewarded in the RL phase — the reward signal targets human-likeness, not raw payout.

## Agent Architecture (Progressive Stages)

Implement in order — do not skip stages:

| Stage | Deliverable | Location |
|-------|-------------|----------|
| 1 | Generate & validate TS client from `openapi.yaml` | `agents/ts-client/` |
| 2 | Observation layer wrapping raw API responses | `agents/strategic_planner/observation.ts` |
| 3 | ActionProposal planner (exhaustive union — no `any`) | `agents/strategic_planner/planner.ts` |
| 4 | Behaviour profiles: `conservative`, `aggressive`, `mixed_adaptive` | `agents/strategic_planner/profiles/` |
| 5 | Orchestrator: session lifecycle, retry logic, circuit breaker | `agents/game_interaction_orchestrator/` |

Agents are **stateless** against the DB — all reads/writes go through the backend API. Local agent state is ephemeral planning context only.

## Reinforcement Learning (Phase 4 — after Phases 1–3 complete)

Do not implement RL components until the backend API, session state machine, and TS agent orchestrator are working end-to-end.

When Phase 4 begins:

- `controller/src/rl_feedback_loop/` stores `Experience` records (state, action, reward, next_state, done) per gameplay event.
- Reward formula: `reward = (payout - stake) - operational_cost + human_likeness_score`
- `agents/rl_model_runner/` runs policy inference against the observation space.
- Experience data exported from the DB's `rl_store` table for offline Gymnasium training.
- RL training **does not write authoritative session state** — backend remains the source of truth.

## Financial Guardrails

Every gameplay action must pass wallet checks before execution. The `controller` enforces:
- Balance ≥ bet amount
- Daily spend limit not exceeded
- Per-spin and per-query cost fees deducted

Violations return structured errors with code `WALLET_LIMIT_EXCEEDED`. The agent must handle this error code without retrying indefinitely.

## Error Contract

All API errors use:
```json
{ "error": { "code": "string", "message": "string", "details": null } }
```

Standard codes: `INVALID_INPUT`, `NOT_FOUND`, `STATE_ERROR`, `WALLET_LIMIT_EXCEEDED`, `RATE_LIMIT`, `INTERNAL_ERROR`, `UNAUTHORIZED`.

## Testing Standards

- **Rust:** Unit test pure state-machine functions. Integration tests wire `game_session_manager` against the DB. Target ≥ 80% coverage on `controller`.
- **TypeScript:** 80% coverage threshold enforced (see `.cursor/rules/testing.mdc`). Unit test planners and behaviour profiles. Integration tests use a mock TS client. E2E tests run against the local slot simulator.
- Run `cargo test --workspace` and `bun test` before any commit.

## Task Sequencing

Tasks live under `tasks/{domain}/{number}_{name}/` — each with `README.md` and `TDD_PLAN.md`. Follow phase order:

```
Phase 1: backend/0001 → 0002 → 0003  (server, session, wallet)
Phase 2: backend/0004 → 0005          (events, fingerprinter)
Phase 3: agents/0001 → 0002 → 0003 → 0004  (client, planner, profiles, orchestrator)
Phase 4: rl/0001 → 0002 → 0003 → 0004  (store, rewards, export, training)
Phase 5: frontend/0001 → ...           (dashboard UI — lowest priority)
```
