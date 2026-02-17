# TDD Plan: 0001 TS Client Bindings

## Units to Test

1. **Client instantiation**
   - Default configuration builds a client (basePath from OpenAPI servers).
   - Custom basePath can be supplied.

2. **Generated model types**
   - At least one schema from OpenAPI is present as a TypeScript type (e.g. `Wallet`, `SessionId`, `Money`).
   - Types are strict (no `any` in public API surface used by tests).

3. **API method presence**
   - Client exposes methods for core operations: createSession, getSession, sessionAction (or equivalent from openapi.yaml paths).
   - Method signatures accept typed request bodies and return typed responses (or Promise thereof).

4. **Error contract**
   - Client or wrapper can represent API error shape (`code`, `message`, `details`) per CONTRACTS.md / openapi.yaml.

## Integration Points

- Input: `openapi.yaml` at repo root.
- Output: `agents/ts-client/` directory; tests import from generated modules.
- No live backend required for unit tests (mocked fetch or stub configuration).

## Mock Data

- Use minimal valid payloads from openapi.yaml examples (e.g. SessionId UUID, Money amount/currency).
- For fetch-based client: mock global fetch or use a test configuration that points to a stub.

## Expected Outputs

- `bun test` runs client-related tests and they pass after implementation.
- `openapi-generator-cli generate ...` produces ts-client without overwriting hand-written agent code (agents/strategic_planner, etc.).
