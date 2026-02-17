# Notes: 0002 Session Dashboard

## Implementation Notes

- OpenAPI lacks GET /sessions; use mock list or "create then view" flow for MVP
- Poll session detail every few seconds when viewing active session
- Use react-query or similar for cache/refetch if available; else useState + useEffect

## Test Results

- (To be filled after implementation)
