# Task: 0001 — UI Shell

## Objective

Establish a foundational UI skeleton (React + Vite) with basic navigation and API integration points.

## Acceptance Criteria

- [x] React + Vite + TypeScript app (bun)
- [x] Routes: Dashboard, Sessions, Wallets, Fingerprints (placeholders for 0002–0004)
- [x] Shared components: Loading, ErrorBoundary, Layout, Nav
- [x] API integration layer wrapping ts-client with basePath from env
- [x] Base theme (CSS variables or Tailwind)
- [x] Component tests for shell, nav, loading, error

## Dependencies

- `agents/ts-client` (generated types and DefaultApi)
- `openapi.yaml` (canonical API contract)

## Contracts Affected

- None (consumes ts-client only)

## Related

- phase-5.md — Frontend Phase
- .cursor/rules/frontend.mdc — Frontend task group
