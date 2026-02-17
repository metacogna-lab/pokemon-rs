1. Overview

This document defines the end-to-end workflow and structural alignment between:

Rust backend data models

Generated TypeScript API interfaces

Agent orchestration layers

Testing & quality standards

The goal is to ensure type safety, contract fidelity, progressive system quality, and robust agent logic across the entire stack.

Agents form the intelligent orchestrator layer that drives autonomous game play, observes outcomes, and feeds back to training loops.

Where possible, TypeScript interfaces should be derived via OpenAPI code generation to prevent drift between backend and agent code.

2. Rust ➝ TypeScript Interface Flow
2.1 Use OpenAPI as the Single Source of Truth

All Rust server domain models (structs + enums) feed into the OpenAPI 3.0 specification.

This spec should fully describe all request and response shapes, including nullability, strict types, and default values.

Benefits:

Prevents type drift between Rust and TS

Generates accurate clients in TS

Improves maintainability and developer safety

2.2 Generate TypeScript Interfaces

Use tooling such as:

openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./agents/ts-client \
  --additional-properties=supportsES6=true


This produces a set of fully typed models and request methods.

Agents must never write manual API models for OpenAPI types. They should always regenerate and revalidate on each API change.

3. Agent Architecture Progression
Stage 1 — Client Bindings & Type Safety
Responsibilities

Generate TS client from backend OpenAPI

Validate types against backend domain expectations

Maintain versioned client artifacts

Deliverables

typescript-fetch client folder (e.g. /agents/ts-client)

Example fetch/use patterns

Type safety gates (no any, fully typed payloads)

Stage 2 — Observation Layer

Provide a typed abstraction over raw API responses:

type Observation = {
  session: SessionModel;
  result?: GameplayResultModel;
  metrics: SessionMetricsModel;
};


Where SessionModel, GameplayResultModel, and SessionMetricsModel are imported from the generated clients.

This layer ensures agents work in terms that mirror the backend precisely.

Stage 3 — Planner & Action Proposal Layer

Build a planner module that takes Observation and outputs ActionProposal.

Must accept strong types and reject unsafe constructs.

Example:

interface ActionProposal {
  type: "PlaceBet" | "Spin" | "CashOut";
  amount?: number;
}


Use exhaustive niters on type to guarantee complete handling of all valid action types.

Stage 4 — Behavioral Profiles

Behavioral profiles encapsulate patterns such as:

conservative (low bet, slow rate)

aggressive (high bet, varied timing)

mixed adaptive (vary based on reward signals)

Profiles must be fully typed and unit-tested.

Stage 5 — Orchestrator & Workflow Engine

The orchestrator manages:

Session start → spin → result retrieval

Agent scheduling with time delays

Error handling and retries

Coordination with RL feedback

Implementation must be robust, with fallback paths and circuit breakers.