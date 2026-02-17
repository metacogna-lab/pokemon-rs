import { describe, expect, test } from "bun:test";
import { meanReward, episodeLength, rewardVariance } from "./metrics";

describe("meanReward", () => {
  test("returns 0 for empty list", () => {
    expect(meanReward([])).toBe(0);
  });

  test("returns correct mean", () => {
    const exps = [
      { reward: 2, done: false },
      { reward: 4, done: false },
      { reward: 6, done: true },
    ];
    expect(meanReward(exps)).toBe(4);
  });
});

describe("episodeLength", () => {
  test("returns full length when no done", () => {
    const exps = [
      { reward: 1, done: false },
      { reward: 2, done: false },
    ];
    expect(episodeLength(exps)).toBe(2);
  });

  test("returns index+1 at first done", () => {
    const exps = [
      { reward: 1, done: false },
      { reward: 2, done: true },
      { reward: 3, done: false },
    ];
    expect(episodeLength(exps)).toBe(2);
  });
});

describe("rewardVariance", () => {
  test("returns 0 for empty or single item", () => {
    expect(rewardVariance([])).toBe(0);
    expect(rewardVariance([{ reward: 1, done: false }])).toBe(0);
  });

  test("returns correct variance", () => {
    const exps = [
      { reward: 2, done: false },
      { reward: 4, done: false },
      { reward: 6, done: false },
    ];
    const v = rewardVariance(exps);
    expect(v).toBe(4);
  });

  test("respects window", () => {
    const exps = [
      { reward: 0, done: false },
      { reward: 0, done: false },
      { reward: 10, done: false },
      { reward: 10, done: false },
    ];
    const v = rewardVariance(exps, 2);
    expect(v).toBe(0);
  });
});
