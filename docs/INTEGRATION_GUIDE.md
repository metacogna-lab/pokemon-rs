# Integration Guide — pokemon-rs Operator Reference

This guide explains how to connect the pokemon-rs system to a target environment, run the exploration loop, and interpret the RL reward signal for offline training.

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Rust / Cargo | 1.75 | `cargo --version` |
| Bun | 1.1+ | full path: `/Users/nullzero/Library/Application Support/reflex/bun/bin/bun` |
| PostgreSQL | 14+ | Optional — backend defaults to in-memory stores |
| curl | any | Used by `launch.sh` health-check |

Install Rust via [rustup](https://rustup.rs/). Bun is bundled with the Reflex runtime on macOS.

---

## 2. Environment Variables

Set these before starting the backend. All variables are optional unless marked **required**.

| Variable | Default | Description |
|----------|---------|-------------|
| `BIND_ADDR` | `0.0.0.0:8080` | TCP address the backend listens on |
| `API_KEYS` | *(unset — dev mode)* | Comma-separated bearer tokens. If unset, all requests are accepted without auth |
| `COST_PER_SPIN` | `0.01` | Fee deducted from wallet per spin action (fractional currency units) |
| `HUMAN_LIKENESS_WEIGHT` | `0.3` | Weight of humanLikeness score in the reward formula |
| `RATE_LIMIT_RPM` | `60` | Maximum requests per minute per API key |
| `API_BASE_URL` | `http://localhost:8080/v1` | Used by TypeScript agents and the frontend |
| `RUN_E2E` | `0` | Set to `1` to enable E2E tests (requires live backend) |
| `API_KEY` | `e2e-test-key` | Key used by E2E tests (must match an entry in `API_KEYS`) |
| `RL_DATA_DIR` | `./rl_data` | Directory where training JSONL files are written |

### Example `.env` for local development

```dotenv
BIND_ADDR=0.0.0.0:8080
API_KEYS=dev-secret-1,dev-secret-2
COST_PER_SPIN=0.01
HUMAN_LIKENESS_WEIGHT=0.3
RATE_LIMIT_RPM=120
API_BASE_URL=http://localhost:8080/v1
RL_DATA_DIR=./rl_data
```

---

## 3. Connecting to a Target Environment

### 3a. In-memory backend (default for dev/CI)

No additional setup. Start the backend and all stores are ephemeral:

```bash
cargo run -p pokemon-cli -- serve
```

All data is lost on restart. Use this mode for unit testing and integration testing.

### 3b. Real slot game API target

The backend acts as a proxy layer. To point it at a real game engine:

1. Implement the slot game API contract defined in `openapi.yaml` (or use the included `slot_game_api_simulator`).
2. Set the `GAME_API_BASE_URL` environment variable to the target endpoint.
3. The `controller::game_session_manager` will forward spin/bet actions to the target URL and parse responses using the standard contract.

```dotenv
GAME_API_BASE_URL=https://target-casino-sandbox.example.com/api/v1
```

> **Important:** The target API must return responses matching the `PlayActionResponse` schema. Symbol names must be strings; payout must be a `Money` object `{ amount: float, currency: string }`.

### 3c. Overriding AppConfig at runtime

`AppConfig` fields (`cost_per_spin`, `human_likeness_weight`, `rate_limit_rpm`) are set from environment variables parsed in `cli/src/config.rs`. You can override any of them per-process without code changes:

```bash
COST_PER_SPIN=0.05 HUMAN_LIKENESS_WEIGHT=0.5 cargo run -p pokemon-cli -- serve
```

---

## 4. Running the Exploration Loop

### Step 1 — Start the backend

```bash
# Development (no auth required)
cargo run -p pokemon-cli -- serve

# Production (with auth)
API_KEYS=prod-secret BIND_ADDR=0.0.0.0:8080 cargo run -p pokemon-cli -- serve
```

### Step 2 — Create a wallet

```bash
curl -X POST http://localhost:8080/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{"walletId": "my-wallet-001", "balance": {"amount": 1000, "currency": "AUD"}, "dailyLimit": {"amount": 500, "currency": "AUD"}}'
```

The wallet ID is used as the session's bankroll. The system deducts `cost_per_spin` from the wallet on each spin.

### Step 3 — Run the training loop

From `agents/`:

```typescript
import { DefaultApi, Configuration } from "./ts-client";
import { getConservativeProfile } from "./strategic_planner/profiles";
import { runTrainingLoop } from "./rl_model_runner/train";

const api = new DefaultApi(new Configuration({ basePath: "http://localhost:8080/v1" }));
const profile = getConservativeProfile();

await runTrainingLoop(api, profile, {
  numEpisodes: 50,
  outputDir: "./rl_data",
  gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
  behaviorType: "conservative",
});
```

Or use the Makefile shortcut:

```bash
make train
```

### Step 4 — Inspect rewards

Episode log lines look like:

```
Episode 12/50: reward=0.347 | ε=0.941 | steps=18 | finalState=Completed
```

- `reward` — total reward accumulated across the episode (sum of per-step rewards)
- `ε` — current epsilon (exploration rate); approaches 0.05 as episodes accumulate
- `steps` — number of play actions taken before the session completed
- `finalState` — should be `Completed` for a clean episode; `Playing` or `Evaluating` indicates the circuit breaker fired

---

## 5. Reward Signal Explained

The per-step reward is computed by the backend in `controller/src/rl_feedback_loop/`:

```
reward = (payout - stake) - cost_per_spin + humanLikeness * human_likeness_weight + completion_bonus
```

| Component | Typical Range | Description |
|-----------|--------------|-------------|
| `payout - stake` | −stake to +jackpot | Net monetary outcome of the spin |
| `cost_per_spin` | 0.01–0.05 | Operational fee deducted from every action |
| `humanLikeness * weight` | 0 to 0.3 | Bonus for maintaining human-like timing patterns |
| `completion_bonus` | 0.1 | One-time reward for reaching the `Completed` state cleanly |

### How humanLikeness is computed

The orchestrator measures the actual inter-spin delay against the target cadence defined by the profile (`delayMsMin`/`delayMsMax`). The score is:

```
humanLikeness = max(0, 1 - |actualMs - midpointMs| / midpointMs)
```

A score of `1.0` means the agent timed the action exactly at the midpoint of the expected range. Scores below `0.3` trigger reduced reward.

---

## 6. Gymnasium Export

After training episodes complete, JSONL files are in `rl_data/episode_N.jsonl`. Each line is a Gymnasium-compatible record:

```json
{"obs": {...}, "action": {...}, "reward": 0.35, "next_obs": {...}, "terminated": false, "truncated": false, "info": {}}
```

### Load in Python for offline training

```python
import json, pathlib
import numpy as np

records = []
for path in sorted(pathlib.Path("rl_data").glob("episode_*.jsonl")):
    with open(path) as f:
        for line in f:
            records.append(json.loads(line))

rewards = np.array([r["reward"] for r in records])
print(f"Total steps: {len(records)}, Mean reward: {rewards.mean():.4f}")
```

To train with Stable-Baselines3 or a custom Gymnasium environment, implement `gym.Env` using the `obs`/`action`/`reward` fields directly. The observation space is the JSON-serialised `GameState` object; the action space is the discrete set `{PlaceBet, Spin, CashOut}`.

---

## 7. State Machine Reference

All sessions pass through these states (enforced by `controller/src/state_engine/`):

```
Idle → Initialized → Probing → Playing → Evaluating → Completed
```

### Valid transitions

| From | To | Trigger |
|------|----|---------|
| `Idle` | `Initialized` | `createSession` |
| `Initialized` | `Probing` | First `playAction` with `PlaceBet` |
| `Probing` | `Playing` | `Spin` after probe phase complete |
| `Playing` | `Evaluating` | `CashOut` or budget exhausted |
| `Evaluating` | `Completed` | Evaluation result recorded |
| Any | `Completed` | Wallet limit exceeded or circuit breaker triggered |

### Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_INPUT` | 400 | Malformed request body |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `NOT_FOUND` | 404 | Session or wallet ID does not exist |
| `STATE_ERROR` | 409 | Invalid state transition attempted |
| `WALLET_LIMIT_EXCEEDED` | 402 | Balance or daily limit exhausted |
| `RATE_LIMIT` | 429 | Too many requests per minute |
| `INTERNAL_ERROR` | 500 | Unexpected backend error |

The orchestrator does **not retry** `WALLET_LIMIT_EXCEEDED`, `UNAUTHORIZED`, `STATE_ERROR`, `NOT_FOUND`, or `INVALID_INPUT`. All other errors are retried with exponential backoff up to `maxRetries` (default: 3).
