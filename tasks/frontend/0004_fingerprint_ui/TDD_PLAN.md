# TDD Plan: 0004 Fingerprint UI

## Units to Test

1. **Game list**
   - Renders mock games
   - Selecting one navigates to detail

2. **Fingerprint detail**
   - Displays RNG signature (JSON or key-value)
   - Displays symbol map (symbol to payout/frequency)
   - Displays statistical profile (RTP, volatility)

3. **Symbol chart**
   - Renders distribution from symbol_map
   - Bar chart or similar visualization

## Integration Points

- Mock GameFingerprint data
- Lightweight chart lib (e.g. recharts) or CSS-only bars

## Mock Data

- gameId, rngSignature, symbolMap, statisticalProfile per plan

## Expected Outputs

- `bun test` passes
- Manual: browse games, view fingerprint, see chart
