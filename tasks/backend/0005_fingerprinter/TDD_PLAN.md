# TDD Plan — 0005 Fingerprinter

## Units to test

1. **Symbol frequency**: Given a list of spin results (symbols per spin), compute symbol counts and frequencies; assert map keys and values.
2. **RNG signature**: Given a sequence of outcomes, produce a deterministic signature (e.g. hash or compact representation); same input → same output.
3. **Statistical profile**: From symbol frequencies and payouts, compute RTP-like metric and volatility indicator; assert numeric bounds (e.g. 0–1 or 0–200% for RTP).
4. **Storage round-trip**: save_fingerprint(game_id, fingerprint) then get_fingerprint(game_id) returns equivalent data.

## Integration points

- Event store (0004) can be input to build fingerprint from session events.
- API handler for GET /games/{id}/fingerprint reads from persistence.

## Mock data

- Spin results: vec of symbols e.g. ["Cherry","Bar","Cherry"]; repeat for N spins.
- Payout map: symbol combo → payout amount for RTP calculation.

## Expected outputs

- extract_symbol_frequencies(spins) → HashMap<String, f64> or similar.
- build_statistical_profile(frequencies, payouts) → struct with rtp, volatility (or similar).
- get_fingerprint(game_id) returns 404 when not found, 200 with body when found.
