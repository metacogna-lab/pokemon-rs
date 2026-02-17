# Notes: 0001 Server Skeleton

## Decisions

- Axum 0.7 with tower-http TraceLayer for logging; auth via axum middleware (from_fn) checking Authorization: Bearer &lt;token&gt;; empty token rejected with 401.

## Blockers

- None.

## Edge Cases

- Auth: empty token, non-Bearer scheme, malformed header.
