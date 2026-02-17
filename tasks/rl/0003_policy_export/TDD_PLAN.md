# TDD Plan — 0003 Policy Export

## Units to test

1. **Export function**: Given store with N experiences, export(session_id, limit, offset) returns correct subset in order
2. **Pagination**: limit=10, offset=5 returns items 5-14
3. **Empty**: Unknown session or no data returns empty array
4. **Shape**: Each exported record has state, action, reward, next_state, done

## Integration points

- API handler calls export; returns 200 with JSON array

## Expected outputs

- export returns Vec<Experience> or serializable equivalent
- API returns 200 with valid JSON; empty array for no data
