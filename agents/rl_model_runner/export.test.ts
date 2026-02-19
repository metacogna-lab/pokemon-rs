/**
 * Unit tests for Gymnasium JSONL export.
 */
import { describe, expect, test } from "bun:test";
import { toGymnasiumRecord, exportToJsonl, type GymnasiumRecord } from "./export";
import type { RlExperience } from "../ts-client";
import { tmpdir } from "os";
import { join } from "path";

function makeExperience(overrides: Partial<RlExperience> = {}): RlExperience {
  return {
    id: "exp-001",
    sessionId: "sess-001",
    state: { state: "Playing" },
    action: { type: "Spin" },
    reward: 0.23,
    nextState: { state: "Evaluating" },
    done: false,
    ...overrides,
  };
}

describe("toGymnasiumRecord", () => {
  test("has all required Gymnasium fields", () => {
    const rec = toGymnasiumRecord(makeExperience());
    const required: (keyof GymnasiumRecord)[] = [
      "obs", "action", "reward", "next_obs", "terminated", "truncated", "info",
    ];
    for (const field of required) {
      expect(rec).toHaveProperty(field);
    }
  });

  test("terminated matches done=false", () => {
    const rec = toGymnasiumRecord(makeExperience({ done: false }));
    expect(rec.terminated).toBe(false);
  });

  test("terminated matches done=true", () => {
    const rec = toGymnasiumRecord(makeExperience({ done: true }));
    expect(rec.terminated).toBe(true);
  });

  test("truncated is always false", () => {
    expect(toGymnasiumRecord(makeExperience({ done: false })).truncated).toBe(false);
    expect(toGymnasiumRecord(makeExperience({ done: true })).truncated).toBe(false);
  });

  test("obs maps to state", () => {
    const exp = makeExperience({ state: { state: "Evaluating" } });
    const rec = toGymnasiumRecord(exp);
    expect((rec.obs as { state: string }).state).toBe("Evaluating");
  });

  test("next_obs maps to nextState", () => {
    const exp = makeExperience({ nextState: { state: "Completed" } });
    const rec = toGymnasiumRecord(exp);
    expect((rec.next_obs as { state: string }).state).toBe("Completed");
  });

  test("reward is preserved exactly", () => {
    const rec = toGymnasiumRecord(makeExperience({ reward: -0.5 }));
    expect(rec.reward).toBe(-0.5);
  });

  test("info is an empty object", () => {
    const rec = toGymnasiumRecord(makeExperience());
    expect(rec.info).toEqual({});
  });
});

describe("exportToJsonl", () => {
  test("writes one JSON line per experience", async () => {
    const exps = [
      makeExperience({ reward: 1.0, done: false }),
      makeExperience({ reward: -0.5, done: true }),
    ];
    const path = join(tmpdir(), `test-export-${Date.now()}.jsonl`);
    await exportToJsonl(exps, path);

    const content = await Bun.file(path).text();
    const lines = content.trim().split("\n").filter(Boolean);
    expect(lines.length).toBe(2);
    const parsed = lines.map((l) => JSON.parse(l) as GymnasiumRecord);
    expect(parsed[0]!.reward).toBe(1.0);
    expect(parsed[1]!.terminated).toBe(true);
  });

  test("empty experiences writes empty file (just newline)", async () => {
    const path = join(tmpdir(), `test-export-empty-${Date.now()}.jsonl`);
    await exportToJsonl([], path);
    const content = await Bun.file(path).text();
    expect(content.trim()).toBe("");
  });
});
