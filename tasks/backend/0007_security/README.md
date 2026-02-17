# Task 0007 — Security

## Objective

Implement auth guardrails: token validation, RBAC, rate limits, and logging of unauthorized access.

## Acceptance criteria

- Bearer token validated (format and optionally signature); 401 with structured error body when invalid or missing.
- Minimal roles (e.g. user, admin); enforce on sensitive routes; log role checks.
- Per-IP or per-token rate limiting; 429 with Retry-After when exceeded.
- Unauthorized attempts logged without PII (codes/IDs only).

## Contracts affected

- OpenAPI: securitySchemes.ApiKeyAuth, security on paths (already declared).
- Rust: middleware or per-handler auth and rate-limit layer.

## Related API endpoints

- All protected paths require valid Bearer token; wallet and session actions respect rate limit.
