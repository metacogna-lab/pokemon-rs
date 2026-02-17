# TDD Plan: 0003 Behavior Profiles

## Units to Test

1. **Profile config types**: Each profile returns object with minBet, maxBet, delayMs (or range), and optional rewardWeight for adaptive.
2. **conservative**: Low stake range, higher delay (slow cadence).
3. **aggressive**: Higher stake range, lower/varied delay.
4. **mixed_adaptive**: Params vary; accept optional reward signal and return valid config.
5. **Boundaries**: No negative amounts; delays within sane range.
