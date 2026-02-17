PRD_CLI.md
Autonomous Slot Gameplay System — CLI Product Requirements
Overview

The CLI is a first-class client to the backend API. It is designed for:

Exploration

Session control

Debugging

Wallet operations

Status inspection

The CLI must use the same contracts as the API, exposing typed input/output and human-friendly output for operators.

Goals

Provide a reliable interface for creating and progressing gameplay sessions.

Map closely to backend API contracts so any change in the API surface is easily propagated to the CLI.

Enable operators to perform actions, query states, and manage wallets.

Offer clear error messages that map back to contract errors.

Integrate with existing development environments.

Core Capabilities
1. Commands & UX

The CLI must support:

Session Commands
Command	Purpose
session create	Create a new session
session status	Query current session state
session action	Perform gameplay actions
session metrics	Retrieve metrics
Financial Commands
Command	Purpose
wallet get	Retrieve wallet details
wallet debit	Debit wallet
wallet credit	Credit wallet
System Commands
Command	Purpose
health	Check service health
2. Contract Adherence

The CLI must:

Generate requests matching OpenAPI contracts

Validate inputs locally before sending

Parse responses into typed outputs

Examples:

cli session create --game-id <uuid> --behavior conservative --max-bet 5.5


Errors should be parsed into CLI errors based on the API’s ErrorResponse contract.

3. Feedback

CLI output must contain:

Clear success indicators

JSON output options for scripting

Human-readable summaries

Examples:

✔ Session created: { "sessionId": "...", "state": "Initialized" }

4. Integration

The CLI must:

Be installable via crate (cargo install)

Support bash/zsh completion

Be scriptable (JSON output)

Success Metrics

CLI will be considered complete when:

It implements the full surface of API contracts

It produces consistent typed outputs

It reflects backend state accurately

It can be used to drive autonomous workflows in scripts