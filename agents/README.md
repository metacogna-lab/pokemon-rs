# pokemon-ts-agents

TypeScript agents for autonomous slot gameplay: strategic planner, behavior profiles, game interaction orchestrator. All API types come from the generated client; do not hand-write models for OpenAPI types.

## Setup

```bash
bun install
```

## Regenerating the TS client

After any change to the root `openapi.yaml`, regenerate the client:

```bash
bun run generate:client
```

This runs `openapi-generator-cli` (typescript-fetch) and writes to `agents/ts-client/`. If the generator output layout changes, update `ts-client/index.ts` to match or re-export from the generated `apis/` and `models/` so that `agents/strategic_planner` and `agents/game_interaction_orchestrator` keep importing from `./ts-client` (or `../ts-client` as appropriate).

## Commands

```bash
bun test          # Run all tests (excludes e2e unless RUN_E2E=1)
bun run test:e2e  # Run e2e tests (requires backend on port 8080)
bun run lint      # ESLint
bun run index.ts  # Run main entry (if any)
```

## E2E tests

E2E tests run only when `RUN_E2E=1`. Start the backend first (e.g. `cargo run -p cli -- serve` or slot simulator on port 8080), then:

```bash
bun run test:e2e
```

To skip e2e in CI when no backend is available, do not set `RUN_E2E`.
