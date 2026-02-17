# Task: 0001 — Server Skeleton

## Objective

Generate server from OpenAPI and wire core scaffolding: handler traits, logging, auth middleware, base request/response types so the backend can serve API requests.

## Acceptance Criteria

- [ ] CLI has `serve` subcommand that binds to `http://localhost:8080` and starts the server.
- [ ] `GET /v1/health` returns 200 and JSON `{ "status": "healthy" }` per openapi.yaml.
- [ ] Handler trait or layer keeps business logic in controller; CLI wires routes.
- [ ] Logging middleware wraps requests (request/response or trace).
- [ ] Auth middleware checks `Authorization: Bearer <token>`; returns 401 with ErrorResponse shape on missing/invalid token (no panic).
- [ ] Request/response types align with openapi.yaml (health response, error shape).
- [ ] `cargo test --workspace` and `cargo clippy --workspace` pass.

## Dependencies

- None (first backend task). Requires `openapi.yaml` and repo layout per CLAUDE.md.

## Contracts Affected

- openapi.yaml: `/health`, ErrorResponse, servers (localhost:8080/v1).

## Related

- phase-1.md — Backend Foundation
- .cursor/rules/backend.mdc — 0001_server_skeleton deliverable
