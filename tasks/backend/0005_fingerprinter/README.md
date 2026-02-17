# Task 0005 — Fingerprinter

## Objective

Implement game fingerprint extraction: RNG signature, symbol mapping, and statistical profile from event stream or game config; persist and expose via API.

## Acceptance criteria

- Functions to derive RNG signature, symbol map, and statistical profile (inputs/outputs typed; no unwrap() in hot path).
- Persist to `games` table (rng_signature, symbol_map, statistical_profile) or equivalent.
- GET `/v1/games/{gameId}/fingerprint` (or equivalent) returns fingerprint for a game.
- Unit tests for extraction (e.g. given N spins, assert symbol frequencies / RTP-like stats).
- Integration test: store fingerprint, fetch by game_id, assert shape.

## Contracts affected

- OpenAPI: new schema for fingerprint response; new path GET /games/{gameId}/fingerprint.
- DATASTORE: §2.1 Game (game_id, rng_signature, symbol_map, statistical_profile).
- Rust: controller `fingerprinter` module.

## Related API endpoints

- GET `/v1/games/{gameId}/fingerprint` — return fingerprint (RNG signature, symbol_map, statistical_profile).
