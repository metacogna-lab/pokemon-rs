PRD_BACKEND.md
Autonomous Slot Gameplay System — Backend Product Requirements
Overview

The backend is the authoritative source of truth for the autonomous slot gameplay system. It must manage:

Session lifecycle and strict state

Gameplay actions

Wallet & financial constraints

API contracts

Reinforcement learning integration

Observability, security, and scalability

It will serve both CLI clients and TypeScript agentic clients with clean, versioned contracts.

Goals

Provide a robust API that adheres to typed contracts (OpenAPI 3.0).

Manage session state with deterministic transitions.

Support autonomous gameplay and fingerprinting of slot engines.

Enforce financial limits before gameplay actions.

Expose telemetry and error contracts for observability.

Enable reinforcement learning integration through structured payloads.

Core Capabilities
1. Typed API Surface

The backend must expose an API that:

Is versioned (v1, v2 as needed)

Uses shared domain types

Provides clear error contracts

Supports both CLI and agent clients

Key Endpoints:

Endpoint	Purpose
POST /sessions	Create a session
GET /sessions/{id}	Query session state
POST /sessions/{id}/action	Take a gameplay action
POST /wallets/{id}/operations	Modify wallet
GET /health	Service health

Contracts must be validated at the boundary.

2. Session & State Management

The backend manages sessions with:

A well-defined state machine (Idle → Initialized → Probing → Playing → Evaluating → Completed)

Idempotent operations where applicable

Persistence to a database (Postgres or similar)

State should be recoverable after crashes, and state transitions should be logged.

Metrics Tracked:

Total spins

Total payout

Reward history

3. Financial Controls

Gameplay actions must be guarded by:

Wallet balance checks

Daily spend limits

Cost per spin and per query

API rate limiting

The wallet system must reject operations that would exceed allowed limits with structured errors.

4. Gameplay Actions

Gameplay actions (spin, place bet, cash out):

Must conform to the GameplayAction schema

Should produce a result containing symbols and optional payout

Should update session metrics

Actions should be idempotent or clearly documented in failure scenarios.

5. Fingerprinting & Game Engine Interaction

The backend must support:

Controlled probing of slot engine characteristics

Extraction of deterministic and statistical signatures

Persistent storage of fingerprint profiles

This will become part of a library of game profiles for agent consumption.

6. Reinforcement Learning Integration

The backend must track and emit:

Reward signals

Experience traces

Policy feedback hooks

These should be available via API and stored for offline training.

7. Security and Auth

The API must enforce:

Token-based authentication

Role-based operation controls (e.g., admin vs agent)

Rate limiting per token

8. Observability

The system must publish:

Application logs

Structured traces

Metrics (Prometheus or equivalent)

Sessions should be traceable through request IDs.

Non-Functional Requirements
Requirement	Target
API Uptime	99.9%
Mean API Latency	< 100ms
Fault Tolerance	Recover state on restart
Scalability	Horizontal API layer
Security	OAuth2 or API tokens, TLS only
Success Metrics

The backend will be considered successful when:

All endpoints are reachable and return valid typed responses

Session state transitions conform to the model

Financial errors are correctly enforced

Logged telemetry matches reality in production