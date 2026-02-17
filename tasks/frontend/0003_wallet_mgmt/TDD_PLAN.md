# TDD Plan: 0003 Wallet Management

## Units to Test

1. **Balance display**
   - Renders balance and daily limit
   - Formats currency (amount + currency code)

2. **Operation form**
   - Validates amount (positive number)
   - Submits debit or credit with walletId
   - Shows success/error feedback

3. **Limit alert**
   - Shows warning when balance low or near daily limit
   - Threshold: e.g. balance < 10 or used > 80% of daily limit

## Integration Points

- Uses DefaultApi.walletOperation
- Mock API for tests

## Mock Data

- Wallet: `{ walletId, balance: { amount: 100, currency: "AUD" }, dailyLimit: { amount: 500, currency: "AUD" } }`

## Expected Outputs

- `bun test` passes
- Manual: display wallet, perform debit/credit
