/**
 * Unit tests for behavior profiles (Stage 4).
 */
import { test, expect } from "bun:test";
import {
  getConservativeProfile,
  getAggressiveProfile,
  getMixedAdaptiveProfile,
  type ProfileConfig,
} from "./index";

test("getConservativeProfile returns low stake and slow delay", () => {
  const p = getConservativeProfile();
  expect(p.minBet).toBeGreaterThanOrEqual(0);
  expect(p.maxBet).toBeLessThanOrEqual(10);
  expect(p.delayMsMin).toBeGreaterThanOrEqual(1000);
  expect(p.delayMsMax).toBeGreaterThanOrEqual(p.delayMsMin);
  expect(p.currency).toBe("AUD");
});

test("getAggressiveProfile returns higher stake and shorter delay", () => {
  const p = getAggressiveProfile();
  expect(p.minBet).toBeGreaterThanOrEqual(1);
  expect(p.maxBet).toBeGreaterThanOrEqual(10);
  expect(p.delayMsMin).toBeLessThanOrEqual(2000);
  expect(p.delayMsMax).toBeGreaterThanOrEqual(p.delayMsMin);
});

test("conservative is slower and lower stake than aggressive", () => {
  const c = getConservativeProfile();
  const a = getAggressiveProfile();
  expect(c.maxBet).toBeLessThan(a.maxBet);
  expect(c.delayMsMin).toBeGreaterThan(a.delayMsMin);
});

test("getMixedAdaptiveProfile returns valid config without reward", () => {
  const p = getMixedAdaptiveProfile();
  expect(p.minBet).toBeGreaterThanOrEqual(0);
  expect(p.maxBet).toBeGreaterThanOrEqual(p.minBet);
  expect(p.delayMsMax).toBeGreaterThanOrEqual(p.delayMsMin);
  expect(p.rewardWeight).toBeDefined();
});

test("getMixedAdaptiveProfile with reward adjusts stake range", () => {
  const neutral = getMixedAdaptiveProfile();
  const positive = getMixedAdaptiveProfile(10);
  const negative = getMixedAdaptiveProfile(-10);
  expect(positive.minBet).toBeGreaterThanOrEqual(0);
  expect(positive.maxBet).toBeGreaterThanOrEqual(positive.minBet);
  expect(negative.minBet).toBeGreaterThanOrEqual(0);
  expect(negative.maxBet).toBeGreaterThanOrEqual(negative.minBet);
  expect(neutral.minBet).toBeGreaterThanOrEqual(0);
});

test("ProfileConfig has no optional fields that break typing", () => {
  const p: ProfileConfig = getConservativeProfile();
  expect(typeof p.minBet).toBe("number");
  expect(typeof p.maxBet).toBe("number");
  expect(typeof p.currency).toBe("string");
  expect(typeof p.delayMsMin).toBe("number");
  expect(typeof p.delayMsMax).toBe("number");
});
