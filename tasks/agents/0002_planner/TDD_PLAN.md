# TDD Plan: 0002 Planner & Action Proposal

## Units to Test

1. **ActionProposal union**: PlaceBet has type and optional amount; Spin/CashOut have type only. Exhaustive switch compiles.
2. **Planner from Observation**: Initialized -> PlaceBet; Playing -> Spin; Completed -> CashOut; other states defined.
3. **Exhaustive handling**: Every ActionProposal type handled; no default that swallows cases.

## Mock Data

Sample Session with state Initialized, Playing, Completed; optional GameplayResult.
