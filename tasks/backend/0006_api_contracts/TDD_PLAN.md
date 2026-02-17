# TDD Plan — 0006 API Contracts

## Units to test

1. **Schema load**: Parse openapi.yaml; assert valid OpenAPI 3.x; required fields present (paths, components.schemas).
2. **Critical paths**: Assert paths exist for /health, /v1/sessions (POST, GET), /v1/sessions/{id}/action (POST), /v1/wallets, error response schema.
3. **Generated client**: After codegen, TS compiles without errors; one smoke test (e.g. instantiate Session type, GameplayAction enum) to ensure types match.

## Integration points

- CI runs codegen and contract tests on openapi.yaml change.
- Agents import from ts-client; no manual API types.

## Mock data

- openapi.yaml from repo root.
- Minimal JSON samples for Session, GameplayAction, ErrorResponse to validate against schema.

## Expected outputs

- Contract test binary/crate or TS test: load spec, assert paths and schemas.
- Codegen script exits 0 and produces agents/ts-client with no overwritten hand edits.
