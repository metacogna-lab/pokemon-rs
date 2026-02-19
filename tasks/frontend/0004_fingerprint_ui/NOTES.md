# Notes: 0004 Fingerprint UI

## Implementation Notes

- Backend 0005 will add GET /games/{gameId}/fingerprint
- Until then, use in-memory mock array of GameFingerprint
- Chart: recharts is common; or simple CSS bar chart for minimal dependency

## Test Results

- `bun run test`: FingerprintsPage tests pass (mock game list, fingerprint detail on select, symbol chart). Mock data in `frontend/src/data/mockFingerprints.ts`; CSS-only bar chart in SymbolChart.
