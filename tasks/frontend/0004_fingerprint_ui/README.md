# Task: 0004 — Fingerprint UI

## Objective

Explore and visualize game fingerprints, symbol maps, RTP profiles.

## Acceptance Criteria

- [ ] List games (mock until GET /games exists)
- [ ] Fingerprint detail view: RNG signature, symbol map, statistical profile
- [ ] Chart for symbol distributions (bar chart)
- [ ] Uses mock data shaped like backend 0005 fingerprint response until API exists

## Dependencies

- 0001_ui_shell
- Mock GameFingerprint type (aligned with backend 0005)

## Contracts Affected

- None (mock data until GET /games/{id}/fingerprint exists)

## Related

- phase-5.md — Frontend Phase
- tasks/backend/0005_fingerprinter — Fingerprint API (future)
