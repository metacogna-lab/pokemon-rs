# Task: 0002 — Session Dashboard

## Objective

Show session list, detail panels, state, metrics, and actions.

## Acceptance Criteria

- [x] Session list (mock list or create-then-view flow until GET /sessions exists)
- [x] Session detail panel: state, metrics (totalSpins, totalPayout)
- [x] Actions: PlaceBet, Spin, CashOut
- [x] Initiate session via createSession form (gameId, behaviorType)
- [x] Live state updates (polling or manual refresh)
- [x] Typed forms and tables using Session, SessionMetrics, GameplayAction from ts-client

## Dependencies

- 0001_ui_shell (routes, layout, API client)
- agents/ts-client

## Contracts Affected

- None (consumes ts-client only)

## Related

- phase-5.md — Frontend Phase
- openapi.yaml — Session, GameplayAction schemas
