# Notes: 0003 Wallet Management

## Implementation Notes

- Wallet ID may come from session's current_wallet_id or be entered by user
- OpenAPI has POST /wallets/{walletId}/operations; no GET wallet endpoint - may need mock or derive from session

## Test Results

- `bun run test`: WalletsPage tests pass (balance/limit display after operation, limit alert when balance low). Manual: enter wallet ID, submit debit/credit, see balance and alerts.
