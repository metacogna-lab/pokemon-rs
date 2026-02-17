# TDD Plan: 0002 Session Dashboard

## Units to Test

1. **Session list**
   - Renders list of sessions
   - Empty state when no sessions

2. **Session detail**
   - Displays state, metrics (totalSpins, totalPayout)
   - Handles loading and error states

3. **Create session**
   - Form submits with valid gameId and behaviorType
   - Shows new session after creation

4. **Play action**
   - Spin/PlaceBet/CashOut buttons call playAction
   - Result (payout, symbols) displayed

## Integration Points

- Uses DefaultApi.createSession, getSession, playAction
- Mock API for tests

## Mock Data

- Session: `{ sessionId, gameId, state: "Playing", metrics: { totalSpins: 10, totalPayout: 5 } }`
- CreateSessionResponse: `{ sessionId, state: "Initialized" }`

## Expected Outputs

- `bun test` passes
- Manual: create session, view detail, execute actions
