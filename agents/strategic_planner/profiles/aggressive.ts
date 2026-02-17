/**
 * Aggressive profile: higher stake, shorter/varied timing.
 */
import type { ProfileConfig } from "./types";

const AGGRESSIVE: ProfileConfig = {
  minBet: 5,
  maxBet: 50,
  currency: "AUD",
  delayMsMin: 500,
  delayMsMax: 2000,
};

export function getAggressiveProfile(): ProfileConfig {
  return { ...AGGRESSIVE };
}
