# TDD Plan: 0005 E2E Tests

## Scope

1. E2E test file runs only when RUN_E2E=1 or test:e2e script.
2. Test: createSession -> getSession -> playAction (PlaceBet then Spin) -> assert session state and result shape.
3. Test: health endpoint returns 200 when server is up.
4. Document in README: start backend (e.g. cargo run -p slot_game_api_simulator or cli serve), then bun test:e2e.
