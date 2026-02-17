# Notes: 0001 Server Skeleton

## Decisions

- Axum 0.7 with tower-http TraceLayer for logging; auth via axum middleware (from_fn_with_state) checking Authorization: Bearer &lt;token&gt;; when API_KEYS env is set, token must be in set; when empty (dev mode), any non-empty Bearer accepted; empty/malformed rejected with 401.

## Blockers

- None.

## Edge Cases

- Auth: empty token, non-Bearer scheme, malformed header.
