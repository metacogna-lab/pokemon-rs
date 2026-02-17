# Notes: 0003 Wallet Controls

## Decisions

- Wallet logic in persistence_metrics::InMemoryWalletStore (WalletRepository::apply_operation): debit checks balance and daily_spent + amount &lt;= daily_limit; credit increases balance. daily_spent tracked on Wallet; WALLET_LIMIT_EXCEEDED returned as 402. cost_rate not applied in Phase 1 (document for later).

## Blockers

- None.

## Edge Cases

- Debit exactly to zero; credit then debit in same day.
