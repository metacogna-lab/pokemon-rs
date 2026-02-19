/**
 * Unit tests for adaptProfile.
 */
import { describe, expect, test } from "bun:test";
import { adaptProfile } from "./adapt";
import type { ExperienceRecord } from "./metrics";
import type { ProfileConfig } from "../strategic_planner/profiles/types";

const baseProfile: ProfileConfig = {
  minBet: 1.0,
  maxBet: 10.0,
  currency: "AUD",
  delayMsMin: 500,
  delayMsMax: 2000,
};

function makeExperiences(rewards: number[]): ExperienceRecord[] {
  return rewards.map((reward, i) => ({ reward, done: i === rewards.length - 1 }));
}

describe("adaptProfile", () => {
  test("insufficient window returns base config unchanged", () => {
    const exps = makeExperiences(Array(10).fill(1.0)); // fewer than window=20
    const result = adaptProfile(baseProfile, exps, 20);
    expect(result).toEqual(baseProfile);
  });

  test("positive mean increases stakes", () => {
    const exps = makeExperiences(Array(20).fill(2.0)); // mean=2.0 → factor=min(1.15, 1+0.1)=1.1
    const result = adaptProfile(baseProfile, exps, 20);
    expect(result.minBet).toBeGreaterThan(baseProfile.minBet);
    expect(result.maxBet).toBeGreaterThan(baseProfile.maxBet);
  });

  test("negative mean decreases stakes", () => {
    const exps = makeExperiences(Array(20).fill(-2.0)); // mean=-2.0 → factor=max(0.85, 1-0.1)=0.9
    const result = adaptProfile(baseProfile, exps, 20);
    expect(result.minBet).toBeLessThan(baseProfile.minBet);
    expect(result.maxBet).toBeLessThan(baseProfile.maxBet);
  });

  test("stakes respect lower bound 0.5", () => {
    const lowBase: ProfileConfig = { ...baseProfile, minBet: 0.5, maxBet: 0.6 };
    const exps = makeExperiences(Array(20).fill(-100.0)); // very negative → factor=0.85
    const result = adaptProfile(lowBase, exps, 20);
    expect(result.minBet).toBeGreaterThanOrEqual(0.5);
  });

  test("stakes respect upper bound 100", () => {
    const highBase: ProfileConfig = { ...baseProfile, minBet: 90, maxBet: 95 };
    const exps = makeExperiences(Array(20).fill(100.0)); // very positive → factor=1.15
    const result = adaptProfile(highBase, exps, 20);
    expect(result.maxBet).toBeLessThanOrEqual(100);
  });

  test("non-stake fields are preserved unchanged", () => {
    const exps = makeExperiences(Array(20).fill(1.0));
    const result = adaptProfile(baseProfile, exps, 20);
    expect(result.currency).toBe(baseProfile.currency);
    expect(result.delayMsMin).toBe(baseProfile.delayMsMin);
    expect(result.delayMsMax).toBe(baseProfile.delayMsMax);
  });

  test("zero mean leaves stakes nearly unchanged", () => {
    const exps = makeExperiences(Array(20).fill(0.0)); // mean=0 → factor=1.0
    const result = adaptProfile(baseProfile, exps, 20);
    expect(Math.abs(result.minBet - baseProfile.minBet)).toBeLessThan(0.01);
    expect(Math.abs(result.maxBet - baseProfile.maxBet)).toBeLessThan(0.01);
  });

  test("only the last `window` experiences are used", () => {
    // First 10 experiences: very negative (should be ignored)
    // Last 20 experiences: positive
    const negative = makeExperiences(Array(10).fill(-100.0));
    const positive = makeExperiences(Array(20).fill(2.0));
    const all = [...negative, ...positive];
    const result = adaptProfile(baseProfile, all, 20);
    // Should increase stakes (using only the positive window)
    expect(result.minBet).toBeGreaterThan(baseProfile.minBet);
  });
});
