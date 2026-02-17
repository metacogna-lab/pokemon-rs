# Task: 0002 — Planner & Action Proposal

## Objective

Implement a planner that takes Observation and outputs ActionProposal with exhaustive handling of all action types. No unsafe constructs or `any`.

## Acceptance Criteria

- [ ] ActionProposal is a discriminated union: PlaceBet | Spin | CashOut (amount only for PlaceBet), aligned with openapi.yaml GameplayAction.
- [ ] Planner function accepts Observation and returns ActionProposal.
- [ ] All action types handled exhaustively (no default fallback that hides missing cases).
- [ ] Unit tests cover representative states and exhaustive handling.
- [ ] No `any`; types imported from generated client where applicable.

## Dependencies

- Task 0001 (ts-client); Observation layer (strategic_planner/observation.ts).

## Related

- AGENTS.md Stage 3; phase-3.md 0002_planner.
