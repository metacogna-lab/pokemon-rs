/**
 * Conservative profile: low stake, slow cadence.
 */
import type { ProfileConfig } from "./types";

const CONSERVATIVE: ProfileConfig = {
  minBet: 0.5,
  maxBet: 2,
  currency: "AUD",
  delayMsMin: 2000,
  delayMsMax: 5000,
};

export function getConservativeProfile(): ProfileConfig {
  return { ...CONSERVATIVE };
}
