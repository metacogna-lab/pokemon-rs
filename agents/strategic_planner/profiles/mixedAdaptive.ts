/**
 * Mixed adaptive profile: params vary by optional reward signal.
 */
import type { ProfileConfig } from "./types";

const BASE_ADAPTIVE: ProfileConfig = {
  minBet: 1,
  maxBet: 20,
  currency: "AUD",
  delayMsMin: 800,
  delayMsMax: 3000,
  rewardWeight: 0.5,
};

/**
 * Returns profile config; if recentReward is provided, adjusts stake range slightly.
 * rewardWeight influences how much reward pushes toward maxBet (positive) or minBet (negative).
 */
export function getMixedAdaptiveProfile(recentReward?: number): ProfileConfig {
  const config = { ...BASE_ADAPTIVE };
  if (typeof recentReward === "number" && config.rewardWeight !== undefined) {
    const shift = recentReward * config.rewardWeight;
    const mid = (config.minBet + config.maxBet) / 2;
    const half = (config.maxBet - config.minBet) / 2;
    const newMid = Math.max(config.minBet, Math.min(config.maxBet, mid + shift));
    config.minBet = Math.max(0.5, newMid - half);
    config.maxBet = Math.max(config.minBet + 1, newMid + half);
  }
  return config;
}
