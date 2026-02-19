# Notes: 0001 UI Shell

## Implementation Notes

- Use React Router v6 for routing
- API client wrapper in `frontend/src/api/client.ts` reads `import.meta.env.VITE_API_BASE_URL`
- Tailwind CSS for base theme and utilities

## Test Results

- `bun run test` (Vitest) passes: Layout, Nav, Loading, ErrorDisplay, ErrorBoundary, API client, SessionsPage, WalletsPage, FingerprintsPage (16 tests).
- `bun run dev` starts dev server; routes /, /sessions, /wallets, /fingerprints render.
