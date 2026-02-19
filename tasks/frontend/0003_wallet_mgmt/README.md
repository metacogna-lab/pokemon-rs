# Task: 0003 — Wallet Management

## Objective

Provide interfaces to view and manage wallets.

## Acceptance Criteria

- [x] Balance display (Wallet.balance, Wallet.dailyLimit)
- [x] Debit/credit form: walletId, operation, amount
- [x] Limit alerts when near or over daily limit
- [x] Uses Wallet, WalletOperationRequest, WalletOperationResponse from ts-client

## Dependencies

- 0001_ui_shell
- agents/ts-client (walletOperation)

## Contracts Affected

- None (consumes ts-client only)

## Related

- phase-5.md — Frontend Phase
- openapi.yaml — Wallet, WalletOperationRequest schemas
