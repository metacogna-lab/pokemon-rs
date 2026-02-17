# TDD Plan — 0001 RL Store

## Units to test

1. **Experience struct**: Serialize to JSONB row shape; assert id, session_id, state, action, reward, next_state, done are present
2. **Validation**: Reject insert when session_id is invalid (nil UUID); reject when required fields missing
3. **ExperienceStore trait**: In-memory impl insert_experience returns Ok(()); list_by_session returns experiences in order
4. **Insert returns Ok/Err**: No panic; Err for invalid data

## Integration points

- ExperienceStore can be wired to real DB when persistence layer exists
- Caller passes Experience built from state transition

## Mock data

- Minimal state: {} or {"game_state": "Playing"}
- Minimal action: {"type": "Spin"}
- Valid session_id: UUID v4

## Expected outputs

- insert_experience returns Ok(()) or Err; no panic
- list_by_session returns Vec<Experience>; empty for unknown session
