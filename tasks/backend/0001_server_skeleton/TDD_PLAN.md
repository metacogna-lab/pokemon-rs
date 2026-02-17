# TDD Plan: 0001 Server Skeleton

## Units to Test

1. **Health endpoint**
   - GET /v1/health returns 200.
   - Response body is JSON with `{ "status": "healthy" }` per OpenAPI.

2. **Request/response types**
   - Health response type matches openapi.yaml schema (status: string).
   - ErrorResponse shape has `error.code`, `error.message`, `error.details` (nullable).

3. **Logging middleware**
   - Requests pass through logging layer; test via integration (server logs) or unit (layer applied).

4. **Auth middleware**
   - Missing `Authorization` header returns 401 and JSON ErrorResponse.
   - Invalid or malformed Bearer token returns 401 and JSON ErrorResponse.
   - No panic on auth failure.

## Integration Points

- CLI: `cargo run -p cli -- serve` starts server; Axum (or equivalent) mounted at /v1.
- Controller: minimal types for health or re-export; no DB.

## Mock Data

- Health: no body. Auth tests: request with no header; request with `Authorization: Bearer invalid`.

## Expected Outputs

- `cargo test --workspace` passes.
- `cargo run -p cli -- serve` runs; GET http://localhost:8080/v1/health returns 200 and correct JSON.
