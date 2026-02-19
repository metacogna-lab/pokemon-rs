/**
 * Profile adaptation: adjust ProfileConfig based on observed reward signal.
 * Increases stakes when mean reward is positive (low variance), reduces them when negative.
 */
import { meanReward, rewardVariance, type ExperienceRecord } from "./metrics";
import type { ProfileConfig } from "../strategic_planner/profiles/types";

const MIN_BET = 0.5;
const MAX_BET = 100;

/**
 * Adapts ProfileConfig stake bounds based on recent reward statistics.
 *
 * Strategy:
 * - Positive mean reward → increase stakes by up to 15% (confident, capital growing)
 * - Negative mean reward → reduce stakes (capital preservation)
 * - Fewer experiences than `window` → return base config unchanged
 *
 * Stakes are always bounded to [MIN_BET (0.5), MAX_BET (100)].
 */
export function adaptProfile(
  base: ProfileConfig,
  experiences: ExperienceRecord[],
  window = 20
): ProfileConfig {
  if (experiences.length < window) return base;

  const recent = experiences.slice(-window);
  const mean = meanReward(recent);

  // Scale factor: positive mean → grow, negative → shrink; clamped to [0.85, 1.15]
  const factor =
    mean > 0
      ? Math.min(1.15, 1 + mean * 0.05)
      : Math.max(0.85, 1 + mean * 0.05);

  const newMinBet = Math.max(MIN_BET, +(base.minBet * factor).toFixed(2));
  const newMaxBet = Math.min(MAX_BET, +(base.maxBet * factor).toFixed(2));

  return {
    ...base,
    minBet: newMinBet,
    maxBet: newMaxBet,
  };
}

export { rewardVariance };
