# Phase 5 — Frontend

Deliver user-facing UI: shell, session dashboard, wallet management, and fingerprint explorer. Lowest priority phase; can be deferred until backend and agents are stable.

## Objective

Provide a foundational UI (e.g. React/Next.js) with navigation, session list/detail, wallet views, and fingerprint visualization. All UI must use strong-typed responses from the generated TypeScript client; validate against TS client types.

## Dependencies

- **Phases 1–3 recommended**: Backend API and agents working so UI can call real or stubbed endpoints. Phase 4 (RL) is not required for frontend.
- Generated TS client available (from Phase 2 api_contracts / Phase 3 agents).

## Entry criteria

- `tasks/frontend/` directory present (per [.cursor/rules/frontend.mdc](.cursor/rules/frontend.mdc)).
- TS client types available for API integration (OpenAPI-generated).
- Optional: Backend and/or slot simulator running for live or stubbed data.

## Atomic tasks (in order)

Agents must pick tasks in dependency order ([frontend.mdc](.cursor/rules/frontend.mdc)): **1. ui_shell → 2. session_dashboard → 3. wallet_mgmt → 4. fingerprint_ui**.

| # | Task ID | Folder | Objective | Key deliverables |
|---|---------|--------|-----------|------------------|
| 1 | 0001_ui_shell | `tasks/frontend/0001_ui_shell/` | Establish foundational UI skeleton with navigation and API integration points. | Skeleton routes (Dashboard, Sessions, Wallets); API integration stubs; shared components (Loading, Error, API client); navigation/layout; base theme; TypeScript client integration; strong-typed responses from OpenAPI. |
| 2 | 0002_session_dashboard | `tasks/frontend/0002_session_dashboard/` | Show session list, detail panels, state, metrics, and actions. | List sessions; view session metrics; initiate session actions via UI; display live state updates. |
| 3 | 0003_wallet_mgmt | `tasks/frontend/0003_wallet_mgmt/` | Provide interfaces to view and manage wallets. | Current balance display; debit/credit operations; limit alerts. |
| 4 | 0004_fingerprint_ui | `tasks/frontend/0004_fingerprint_ui/` | Explore and visualize game fingerprints, symbol maps, RTP profiles. | List games; view fingerprint details; chart symbol distributions. |

Implement strictly in order: 0001 → 0002 → 0003 → 0004. UI shell is the base for all other frontend tasks.

## Agent instructions (reference)

From [.cursor/rules/frontend.mdc](.cursor/rules/frontend.mdc):

- Pick tasks in dependency order: ui_shell → session_dashboard → wallet_mgmt → …
- **Validate UI against TS client types** — use generated types for all API responses and request payloads.

## Exit criteria and quality gates

- All frontend sub-folders have valid `.mdc` files (frontend.mdc exit criteria).
- **Type safety**: UI uses generated TS client types only; no manual API models for OpenAPI-backed endpoints.
- **TDD**: Where applicable, UI components and flows covered by tests (e.g. component tests, integration with mock API).
- **Documentation**: Task READMEs and NOTES.md updated; any new routes or contracts reflected in docs.

## References

- [CLAUDE.md](CLAUDE.md) — Phase 5 (frontend/0001 …); lowest priority; task sequencing.
- [.cursor/rules/frontend.mdc](.cursor/rules/frontend.mdc) — Frontend task group; dependency order; validate UI against TS client types.
- [tasks/PRD.md](tasks/PRD.md) — Sections 1.1–1.4 (UI shell, Session dashboard, Wallet mgmt, Fingerprint explorer).
