# TDD Plan — 0007 Security

## Units to test

1. **Token parsing**: Extract Bearer token from Authorization header; valid format; missing or malformed returns Err.
2. **Token validation**: Valid token (e.g. known secret or JWT signature) returns Ok(claims/role); invalid signature or expired returns Err.
3. **Rate limit**: In-memory or mock store; N requests in window → first N-1 Ok, Nth returns 429; assert Retry-After header.

## Integration points

- Middleware runs before handlers; 401/429 short-circuit response.
- Logging: on 401 log request_id and error code only (no token or PII).

## Mock data

- Valid token string; invalid token; missing header.
- Burst of requests to same key or IP to trigger rate limit.

## Expected outputs

- Unit: parse_authorization("Bearer x") → Ok("x"); parse_authorization("Basic x") → Err.
- Integration: request without Authorization → 401; request with valid token → 200; request over limit → 429 with Retry-After.
