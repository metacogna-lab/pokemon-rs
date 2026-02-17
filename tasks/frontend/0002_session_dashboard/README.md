# Task: 0002 — Session Dashboard

## Objective

Show session list, detail panels, state, metrics, and actions.

## Acceptance Criteria

- [ ] Session list (mock list or create-then-view flow until GET /sessions exists)
- [ ] Session detail panel: state, metrics (totalSpins, totalPayout)
- [ ] Actions: PlaceBet, Spin, CashOut
- [ ] Initiate session via createSession form (gameId, behaviorType)
- [ ] Live state updates (polling or manual refresh)
- [ ] Typed forms and tables using Session, SessionMetrics, GameplayAction from ts-client

## Dependencies

- 0001_ui_shell (routes, layout, API client)
- agents/ts-client

## Contracts Affected

- None (consumes ts-client only)

## Related

- phase-5.md — Frontend Phase
- openapi.yaml — Session, GameplayAction schemas
