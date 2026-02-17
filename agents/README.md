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
bun test          # Run all tests
bun run lint      # ESLint
bun run index.ts  # Run main entry (if any)
```
