DATASTORE.md
Purpose

This document defines:

Core data model structure

Entity relationships & normalization

How subsystems (Backend, CLI, Agents, RL) interact with data

Indexing, temporal state, event stores

Cursor / .mdc style progressive metadata control

Storage rules for performance & reliability

1. OVERVIEW — DATA DOMAINS

The system uses modular storage domains:

╔═════════════════════╗
║    CORE DOMAIN      ║   PRIMARY DATA
╠═════════════════════╣
║  Games              ║ Game definitions + fingerprints
║  Sessions           ║ Session state + history
║  Wallets            ║ Financial balances & limits
║  Gameplay Events    ║ Spin actions & results
║  RL Store           ║ Experiences / Reward signals
║  Analytics          ║ Metrics + Reporting
╚═════════════════════╝

2. DATA MODEL — ENTITIES & SCHEMA
2.1 Game
Column	Type	Notes
game_id	UUID (PK)	Unique game identifier
name	text	Human name
rng_signature	jsonb	JSON description of RNG patterns
symbol_map	jsonb	Mapped symbols & payouts
statistical_profile	jsonb	RTP, volatility, etc.
created_at	timestamp	
2.2 Session
Column	Type	Notes
session_id	UUID (PK)	Unique session
game_id	UUID (FK)	References Game
player_profile	jsonb	Behavior type, max bet
state	enum	Idle/Initialized/…
metrics	jsonb	Running counters
current_wallet_id	UUID	Wallet in use
created_at	timestamp	
updated_at	timestamp	
2.3 Wallet
Column	Type	Notes
wallet_id	UUID (PK)	Unique wallet
balance	decimal	Current available
daily_limit	decimal	Hard spend limit
cost_rate	jsonb	Per spin/query fees
created_at	timestamp	
updated_at	timestamp	
2.4 Gameplay Event
Column	Type	Notes
event_id	UUID (PK)	Unique
session_id	UUID (FK)	Session
action	jsonb	Bet/Spin/CashOut
result	jsonb	Symbols, payout
timestamp	timestamp	
reward	float	RL reward
2.5 RL Store (Experience / Buffers)
Column	Type	Notes
id	UUID (PK)	Unique
session_id	UUID	
state	jsonb	Before action
action	jsonb	Chosen action
reward	float	
next_state	jsonb	
done	boolean	
created_at	timestamp	
2.6 Analytics / Metrics (Materialized)
Column	Type	Notes
session_id	UUID	
key	text	Metric name
value	numeric	Value
recorded_at	timestamp	
3. STORAGE PATTERNS
3.1 NORMALIZATION

Games, Sessions, Wallets are core normalized tables.

Events, RL Store are append-only for immutability.

3.2 JSONB FOR FLEXIBILITY

Player profiles, session metrics, action/result data use JSONB columns to allow schema evolution.

3.3 INDEXING

Index on session_id, game_id, wallet_id for fast reads.

Event store indexed by session_id & timestamp.

4. SUBSYSTEM INTERACTION WITH DATA
4.1 BACKEND

The backend is the primary orchestrator:

Writes fiduciary state (session.state, wallet balance)

Emits events to Gameplay Event

Writes RL transitions

Backend binds closely to the Session state machine, validating transitions before persistence.

Endpoints translate to:

API	Writes / Reads
POST /sessions	Sessions
POST /sessions/{id}/action	GameplayEvent, Sessions, RL
GET /sessions/{id}/events	Reads GameplayEvent (list by session)
POST /wallets/{id}/operations	Wallet
4.2 CLI

The CLI is stateless regarding data — it:

Calls backend APIs

Parses returned shapes

Displays results

The CLI never writes directly to storage — no local persistence.

4.3 TYPESCRIPT AGENT CLIENT

Agents:

Read session state and events via API

Make decisions based on latest stored state

Send actions via backend API

Agents cache data on-device only for planning, but persist authoritative state only via API.

4.4 REINFORCEMENT LEARNING SYSTEM

The RL component can:

- Consume RL Store (rl_store table) for training batches via GET /rl/export
- Export experiences in Gymnasium-compatible format
- Compute metrics: mean reward, episode length, reward variance (agents/rl_model_runner/metrics.ts)
- Run policy inference via agents/rl_model_runner.infer(observation)

RL training does not write authoritative state — sessions remain backend’s responsibility.