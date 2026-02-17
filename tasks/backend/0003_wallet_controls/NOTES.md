# Notes: 0003 Wallet Controls

## Decisions

- Wallet logic in persistence_metrics::InMemoryWalletStore (WalletRepository::apply_operation): debit checks balance ≥ amount and daily_spent + amount ≤ daily_limit; credit increases balance. daily_spent tracked on Wallet; WALLET_LIMIT_EXCEEDED returned as 402. cost_rate (per-spin/query fee) deferred to Phase 2+ — document in CONTRACTS when implementing.

## Blockers

- None.

## Edge Cases

- Debit exactly to zero; credit then debit in same day.
