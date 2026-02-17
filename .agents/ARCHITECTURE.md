# ARCHITECTURE.md
## Table of Contents

Introduction

High-Level Architecture Overview

Data Modeling

State Management System

Rust Backend API Design & Contracts

CLI Design

TypeScript Gameplay Agents

Reinforcement Learning Integration

Financial Integration

Operational Contracts & Guardrails

Security, Monitoring & Observability

### MVP Roadmap

1. Introduction

This document outlines a production-ready backend architecture for an autonomous gameplay system that:

Plays and fingerprints slot engines autonomously

Simulates human-like interaction via distributed agents

Provides strong API and CLI contracts

Stores and manages game state rigorously

Integrates financial operations with rate and cost constraints

Supports reinforcement learning evaluation loops

The architecture leverages Rust for backend core, TypeScript for agent orchestration, and an API interface enabling modular, scalable workflows. This follows agentic best practices and structured state/contract design patterns.

2. High-Level Architecture Overview
 ┌───────────────────────────────────────────────────────────────┐
 │                         Frontend / UI                         │
 │ (Web / Dashboard for status, analytics)                        │
 └──────────────▲───────────────────────────────▲─────────────────┘
                │                                       │
                │REST/gRPC                             │GraphQL optional
                ▼                                       ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                         API Gateway / Router                  │
 │ - Authentication / Authorization                             │
 │ - Rate Limiting                                              │
 │ - API Contracts / Versioning                                 │
 └──────────────▲───────────────────────────────▲─────────────────┘
                │                                       │
                │ Backend API                             │ CLI
                ▼                                       ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                      Rust Backend Services                     │
 │                                                               │
 │ ┌───────────────┐ ┌──────────────────┐ ┌─────────────────────┐ │
 │ │Session & State│ │Fingerprint Engine│ │Financial Management │ │
 │ │Manager        │ │(+ Stats)         │ │Gateway Contracts     │ │
 │ └───────────────┘ └──────────────────┘ └─────────────────────┘ │
 │                                                               │
 │      Persistent Stores: Postgres / Timeseries DB / Cache       │
 └───────────────────────────────────────────────────────────────┘
                ▲                               ▲
                │                               │
                │ Async Events / gRPC             │ RPC/Events
                ▼                               ▼
 ┌────────────────────────────┐        ┌────────────────────────────┐
 │     Gameplay Agents (TS)   │        │ Reinforcement Learning     │
 │ - Strategic Planner        │        │ Trainer / Evaluator        │
 │ - Simulator Proxy          │        │ (Python / Rust / TS)       │
 │ - Interaction Orchestrator │        └────────────────────────────┘
 └────────────────────────────┘

3. Data Modeling

Strong typed data models are core to system correctness, contract validation, and interoperability between Rust, TS, and CLI.

3.1 Core Domain Entities

Rust types enforce invariants and constrain domain values:

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GameId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Currency {
    AUD,
    USD,
    EUR,
    // Extend as needed
}

/// A complete slot game identification and meta fingerprint
pub struct GameFingerprint {
    pub game_id: GameId,
    pub rng_signature: HashMap<String, String>,
    pub symbol_map: Vec<SymbolDefinition>,
    pub statistical_profile: StatisticalProfile,
}

pub struct SymbolDefinition {
    pub symbol_id: u32,
    pub name: String,
    pub payout_values: Vec<usize>,
}
 
pub struct StatisticalProfile {
    pub volatility: f64,
    pub rtp_estimate: f64,
    pub spin_timing: TimeSignature,
}

3.2 Session & Play Models
pub struct Session {
    pub id: Uuid,
    pub game: GameId,
    pub player_profile: PlayerProfile,
    pub state: GameState,
    pub metrics: SessionMetrics,
}

pub struct PlayerProfile {
    pub behavior_type: BehaviorType,
    pub max_bet: Option<f64>,
}

/// Comprehensive tracking of gameplay outcomes
pub struct SessionMetrics {
    pub total_spins: u64,
    pub total_payout: f64,
    pub reward_history: Vec<RewardSignal>,
}

3.3 Financial Contracts
pub struct Wallet {
    pub id: Uuid,
    pub balance: f64,
    pub currency: Currency,
    pub limits: WalletLimits,
}

pub struct WalletLimits {
    pub max_bet: f64,
    pub daily_spend_limit: f64,
    pub cost_rate: CostRate,
}

/// Ensures billing policies and cost accounting
pub struct CostRate {
    pub per_spin_fee: f64,
    pub per_query_fee: f64,
}


Contracts between frontend, CLI, and backend must validate these types via API schemas.

4. State Management System

State is modeled explicitly and transitions are fully exhaustive and typed:

pub enum GameState {
    Idle,
    Initialized { timestamp: DateTime },
    Probing,
    Playing { spin_count: usize },
    Evaluating,
    Completed,
}

State Machine Principles

Transitions are pure functions returning new state.

No global mutable state (use async locking where needed).

Integration of state with database persistence ensures crash/suspend recovery.

State transitions are logged for observability.

State Transition Logic (Rust + CLI)
fn transition_state(current: &GameState, input: GameEvent) -> Result<GameState> {
    match (current, input) {
         (GameState::Idle, GameEvent::Start) => Ok(GameState::Initialized { .. }),
         (GameState::Initialized { .. }, GameEvent::Probe) => Ok(GameState::Probing),
         (GameState::Probing, GameEvent::ProbeComplete) => Ok(GameState::Playing { .. }),
         // ...
         _ => Err(StateError::InvalidTransition),
    }
}

5. Rust Backend API Design & Contracts
5.1 API Contract Principles

Versioned HTTP/gRPC APIs

Input validation + Typed Responses

Structured error formats

Pagination & rate limits

API contracts generated from Rust types using tonic or openapi tooling

Example API snippet (using axum + serde):

#[post("/sessions")]
async fn create_session(body: CreateSessionRequest) -> ApiResponse<CreateSessionResponse> { … }


Contracts (JSON Schema) are generated from shared Rust types to:

Validate HTTP requests

Generate CLI client bindings

Drive TS agent integrations

6. CLI Design

The CLI is a first-class client against the backend, and its commands must adhere to API contracts.

Example commands:

play start --game-id <id>
play status --session-id <id>
fingerprint run --game-id <id>
wallet get --wallet-id <id>


CLI maps tightly to API endpoints and uses shared typed models.

7. TypeScript Gameplay Agents

Agentic systems orchestrate play sequences: select actions, interact with Rust via API, and gather outcomes. Agents manage adaptive strategies and push decisions.

Principles:

Statelss API calls

Clear request / response contract adherence

Evaluation loop management

Replay buffers (for RL feedback)

Agent roles:

Planner: chooses next action

Simulator Proxy: invokes gameplay

Learner: updates strategies

Agents follow best practices in architectural patterns for agentic AI systems — such as separating planning, memory, and execution elements.

8. Reinforcement Learning Integration

Reinforcement loops evaluate outcomes and optimize strategies.

Basic RL cycle:

state -> agent_action -> backend_play -> reward_signal -> update_policy


Reward definition (Phase 4):

reward = (payout - stake) - operational_cost + human_likeness_score

Human-likeness is rewarded; raw payout is tempered by operational cost. Experience records (state, action, reward, next_state, done) are stored in rl_store and exported via GET /rl/export for offline Gymnasium training. RL training does not write authoritative session state; backend remains source of truth. Policy inference runs in agents/rl_model_runner (stub delegates to strategic_planner until trained model exists).

Experience replay and policy updates should be decoupled from live gameplay for cost control.

9. Financial Integration

A dedicated Financial Management module tracks usage and enforces maximum permitted spend:

Wallet balance checks before spin

Daily spend limits

Rate limits on external API calls

Every gameplay request validates against Wallet limits before execution.

10. Operational Contracts & Guardrails

Key guardrails:

API rate limits (configurable)

Cost checks before operations

Structured error formats

Observability instrumentation (metrics & logs)

Contracts should include:

{
  "error": {
    "code": "WALLET_LIMIT_EXCEEDED",
    "message": "The requested action exceeds the wallet limit."
  }
}

11. Security, Monitoring & Observability

AuthN/AuthZ on API

Metrics via Prometheus

Tracing via OpenTelemetry

Alerts on unusual state transitions

12. MVP Roadmap
Milestone	Scope
Phase I	Core Rust types + API + CLI
Phase II	Fingerprinting + Session + State
Phase III	TS agent loop + basic RL
Phase IV	Financial integration + constraints
Phase V	Full observability + cost analytics