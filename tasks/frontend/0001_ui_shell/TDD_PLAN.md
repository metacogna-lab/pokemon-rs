# TDD Plan: 0001 UI Shell

## Units to Test

1. **Layout**
   - Renders nav and outlet
   - Nav links resolve to correct routes (Dashboard, Sessions, Wallets, Fingerprints)

2. **Loading**
   - Shows spinner/skeleton when `loading=true`
   - Hides content when loading

3. **Error**
   - Renders error message from ErrorResponse shape
   - Displays user-friendly message

4. **API client**
   - Config accepts `VITE_API_BASE_URL` from env
   - Fetch calls use configured basePath

5. **Nav**
   - Renders all navigation links
   - Active link is visually indicated

## Integration Points

- Input: `frontend/src/` components
- Output: `frontend/` app with routes and shared components
- Uses `agents/ts-client` for typed API

## Mock Data

- None required for shell tests (layout/routing only)

## Expected Outputs

- `bun test` runs frontend tests and they pass
- `bun run dev` starts dev server; all routes render
