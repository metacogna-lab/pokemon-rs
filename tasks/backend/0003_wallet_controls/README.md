# Task: 0003 — Wallet Controls

## Objective

Implement wallet debit/credit with balance and daily limit checks; persist and rollback on failure; cost-fee enforcement; return WALLET_LIMIT_EXCEEDED for violations.

## Acceptance Criteria

- [ ] Wallet logic: read wallet, validate balance ≥ 0 and daily limit, apply debit/credit, persist.
- [ ] Failed operation does not leave wallet inconsistent (rollback or transaction).
- [ ] Cost fee applied per operation when applicable (document in NOTES.md).
- [ ] POST /v1/wallets/{walletId}/operations wired; 402 with ErrorResponse code WALLET_LIMIT_EXCEEDED when limits exceeded.
- [ ] Money/Currency/Wallet types aligned with OpenAPI and CONTRACTS.md.
- [ ] Integration tests: success path and limit-exceeded path.
- [ ] `cargo test --workspace` and `cargo clippy --workspace` pass.

## Dependencies

- 0001 (server), 0002 (sessions, persistence). Migrations include wallets table.

## Contracts Affected

- Wallet, WalletOperationRequest/Response; POST /wallets/{walletId}/operations; error code WALLET_LIMIT_EXCEEDED.

## Related

- phase-1.md, CLAUDE.md — Financial guardrails
