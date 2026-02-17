# TDD Plan: 0004 Orchestrator

## Units to Test

1. **Session lifecycle**: Mock API; run orchestrator; verify createSession, getSession, playAction called in order; Observation built from responses.
2. **Retry**: Transient failure (e.g. 500) triggers retry with backoff; eventual success completes.
3. **Circuit breaker**: N consecutive failures stop further calls; state resettable or timeout.
4. **WALLET_LIMIT_EXCEEDED**: On this code, do not retry; fail fast and surface error.
5. **Delays**: Profile delay params used for inter-action delay (can mock time).
