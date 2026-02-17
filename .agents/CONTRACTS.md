Below is a **comprehensive CONTRACTS.md** tailored to your slot machine gameplay system. It covers **progressive contract revelation**, **context management**, **agent instructions**, and **typed API/CLI/agent contracts**. These are designed to enable correct, type-safe integration between the **Rust backend**, **CLI**, and **TypeScript agent system** while supporting **stateful session progression** and **reinforcement feedback loops**.

---

# CONTRACTS.md

---

## 📌 Purpose & Scope

This document defines the **formal contracts** used across layers of the autonomous slot gameplay system. It includes:

* API schemas
* CLI request/response shapes
* Agent interaction contracts
* State transition invariants
* Progressive context reveal for agentic reasoning

These contracts enforce type safety, facilitate code generation, and ensure consistent state handling.

Contracts are expressed in:

* **Rust types** (canonical source)
* **JSON Schema / OpenAPI**
* **TypeScript interfaces**

---

## 🧠 Progressive Context & Contract Reveal

Because system clients (CLI, frontend, agents) operate at different **levels of context access**, we progressively reveal contract scopes:

| Context Scope               | Who Uses It       | Contract Type              |
| --------------------------- | ----------------- | -------------------------- |
| **Public API**              | CLI / UI / Agents | HTTP/gRPC JSON API         |
| **Session Context**         | Agents / Backend  | Runtime session state      |
| **Internal Backend**        | Rust core         | Domain types + invariants  |
| **Agent Reasoning Context** | TypeScript        | Observation + Action space |

---

## 1. Backend Core – Rust Domain Types (Source of Truth)

All API and agent contracts derive from these types.

### ➤ Currency & Financial

```rust
#[derive(Serialize, Deserialize, Debug, Clone, Eq, PartialEq)]
pub enum Currency {
    AUD,
    USD,
    EUR,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Money {
    pub amount: f64,
    pub currency: Currency,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Wallet {
    pub wallet_id: Uuid,
    pub balance: Money,
    pub daily_limit: Money,
}
```

### ➤ Identity & References

```rust
#[derive(Serialize, Deserialize, Debug, Clone, Eq, PartialEq, Hash)]
pub struct GameId(pub Uuid);

#[derive(Serialize, Deserialize, Debug, Clone, Eq, PartialEq, Hash)]
pub struct SessionId(pub Uuid);
```

### ➤ Session State

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum GameState {
    Idle,
    Initialized { started_at: DateTime<Utc> },
    Probing,
    Playing { spin_count: usize },
    Evaluating,
    Completed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub session_id: SessionId,
    pub game_id: GameId,
    pub state: GameState,
    pub metrics: SessionMetrics,
}
```

### ➤ Gameplay Events & Actions

```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum GameplayAction {
    PlaceBet { amount: Money },
    Spin,
    CashOut,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameplayResult {
    pub payout: Option<Money>,
    pub symbols: Vec<String>,
}
```

### ➤ Gameplay Event Record (persisted per action)

```rust
pub struct GameplayEvent {
    pub event_id: Uuid,
    pub session_id: Uuid,
    pub action: JsonValue,  // GameplayAction shape
    pub result: JsonValue,  // GameplayResult shape
    pub timestamp: Option<DateTime<Utc>>,
    pub reward: Option<f64>,
}
```

API: GET /sessions/{sessionId}/events returns { events: GameplayEventRecord[] }.

### ➤ Game Fingerprint (Phase 2)

GET /games/{gameId}/fingerprint returns GameFingerprintResponse: gameId, rngSignature, symbolMap (symbol -> frequency), statisticalProfile (rtp_ratio, volatility).

### ➤ Reward Signals (for RL)

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RewardSignal {
    pub reward: f64,
    pub timestamp: DateTime<Utc>,
    pub reason: String,
}
```

---

## 2. Public API Contracts (OpenAPI / JSON Schema)

Use these definitions to generate clients (CLI, TS).

### ➤ Create Session

**Request**

```jsonc
{
  "game_id": "uuid-string",
  "player_profile": {
    "behavior_type": "string",
    "max_bet": 10.5
  }
}
```

**Response**

```jsonc
{
  "session_id": "uuid-string",
  "state": "Initialized"
}
```

### ➤ Perform Action

**Request**

```jsonc
{
  "session_id": "uuid-string",
  "action": {
     "type": "PlaceBet",
     "bet_amount": 2.5
  }
}
```

**Response**

```jsonc
{
  "session_id": "uuid-string",
  "new_state": "Playing",
  "result": {
    "payout": 5.0,
    "symbols": ["A", "B", "C"]
  }
}
```

### ➤ Get Session Status

**Response**

```jsonc
{
  "session_id": "uuid-string",
  "state": "Playing",
  "metrics": {
    "total_spins": 10,
    "total_payout": 150.0
  }
}
```

---

## 3. CLI Contract (Command Definitions)

CLI commands must adhere to backend API and expose the same JSON models.

### ➤ Command: Create Session

```bash
cli session create --game-id <uuid> --profile-json-file config.json
```

**Return**

```json
{ "session_id": "uuid-string", "state": "Initialized" }
```

### ➤ Command: Perform Action

```bash
cli session action --session-id <uuid> --action-json-file action.json
```

**Return**

```json
{ "session_id": "uuid-string", "new_state": "Playing", "result": { ... } }
```

### ➤ Command: Session Status

```bash
cli session status --session-id <uuid>
```

---

## 4. TypeScript Agent Contracts

Agents require precise contracts for:

* Observation
* Action proposals
* Feedback loops

### ➤ Observations

```ts
export interface Observation {
  sessionId: string;
  state: "Idle" | "Initialized" | "Playing" | "Evaluating" | "Completed";
  result?: GameplayResult;
  metrics: SessionMetrics;
}

export interface SessionMetrics {
  totalSpins: number;
  totalPayout: number;
}
```

### ➤ Action Proposal

```ts
export type ActionProposal = {
  type: "PlaceBet" | "Spin" | "CashOut";
  amount?: number;
};
```

### ➤ Agent Command Payload

```ts
export interface AgentCommand {
  sessionId: string;
  action: ActionProposal;
}
```

---

## 5. State & Transition Contracts

At runtime, state transitions must be deterministic and validated.

### ➤ Valid Transitions

| From State  | Allowed Inputs | To State             |
| ----------- | -------------- | -------------------- |
| Idle        | Start          | Initialized          |
| Initialized | Probe          | Probing              |
| Probing     | ProbeComplete  | Playing              |
| Playing     | SpinResult     | Playing / Evaluating |
| Evaluating  | EvaluateDone   | Completed            |

### ➤ State Error Contract

```ts
export interface StateTransitionError {
  code: "INVALID_TRANSITION" | "ACTION_NOT_ALLOWED";
  message: string;
  currentState: string;
  attemptedAction: string;
}
```

---

## 6. Progressive Context Reveal for Agents

Agents interact with **increasingly rich contexts** as gameplay progresses:

### ➤ Context Level 0 – Session Bootstrap

```ts
{
  sessionId: string;
  gameId: string;
}
```

### ➤ Context Level 1 – Active Play

```ts
{
  sessionId: string;
  state: string;
  lastResult?: GameplayResult;
}
```

### ➤ Context Level 2 – Performance Summary

```ts
{
  sessionId: string;
  state: "Playing" | "Evaluating";
  metrics: SessionMetrics;
  rewardSignals: RewardSignal[];
}
```

Agents should only access the level appropriate to their role.

---

## 7. Financial Contract & Limit Checks

### ➤ Wallet Request

```jsonc
{
  "wallet_id": "uuid-string",
  "operation": "debit" | "credit",
  "amount": 5.0
}
```

### ➤ Wallet Response

```jsonc
{
  "wallet_id": "uuid-string",
  "balance": 95.0,
  "limits": {
    "daily_limit": 100.0,
    "currency": "AUD"
  }
}
```

If a requested action would exceed wallet limits, the API must throw:

```jsonc
{
  "error": {
    "code": "WALLET_LIMIT_EXCEEDED",
    "message": "Requested spend exceeds daily limit."
  }
}
```

---

## 8. Reinforcement Feedback Contract

Agent feedback is stored in an experience buffer:

```ts
export interface Experience {
  observation: Observation;
  action: ActionProposal;
  reward: number;
  nextObservation: Observation;
  done: boolean;
}
```

---

## 9. Error Contract (Unified)

All APIs should return this shape on error:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": object | null
  }
}
```

Standard codes include:

| Code                  | Meaning                  |
| --------------------- | ------------------------ |
| INVALID_INPUT         | Validation error         |
| NOT_FOUND             | Resource does not exist  |
| STATE_ERROR           | Invalid state transition |
| WALLET_LIMIT_EXCEEDED | Financial limit          |
| RATE_LIMIT            | Too many requests        |
| INTERNAL_ERROR        | Unexpected failure       |

---

## 10. Security & Authorization Contracts

All endpoints must require an API token. Example header:

```
Authorization: Bearer <token>
```

Unauthorized access errors must return:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or missing token." } }
```

---

## 11. Versioning

Contracts must embed semver:

```json
{ "apiVersion": "v1.0.0" }
```

Clients must validate version on connect.

---

## 🔚 Summary of Guarantees

* **Type Safety:** Rust authoritative models propagate to API/CLI/agents
* **Predictable State:** Clear transitions with exhaustive validation
* **Financial Guardrails:** Wallet contracts enforce spend limits
* **Agent Context Management:** Progressive reveal for agent reasoning
* **Unified Errors & Versioning:** Apps handle failures cleanly
