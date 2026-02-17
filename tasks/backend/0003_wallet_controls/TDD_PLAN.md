# TDD Plan: 0003 Wallet Controls

## Units to Test

1. **Debit**
   - Debit reduces balance; balance never below zero.
   - Debit exceeding balance returns error (WALLET_LIMIT_EXCEEDED or equivalent).
   - Daily spend limit: debit that would exceed daily limit returns error.

2. **Credit**
   - Credit increases balance; persists.

3. **Consistency**
   - Failed operation (e.g. debit over limit) does not persist partial state; rollback or transactional behavior.

4. **Cost fee**
   - When cost_rate applies, fee deducted (or documented); test fee application if applicable.

5. **API**
   - POST /v1/wallets/{id}/operations with debit: 200 and Wallet when allowed; 402 with WALLET_LIMIT_EXCEEDED when limit exceeded.
   - POST with credit: 200 and updated Wallet.

## Integration Points

- controller wallet module (or persistence_metrics); wallets table; sessions link current_wallet_id.

## Mock Data

- Wallet with balance and daily_limit; debit amount under/over limit.

## Expected Outputs

- Wallet operations succeed or return structured error; integration tests cover success and limit-exceeded.
