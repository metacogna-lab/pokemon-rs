/**
 * Unit tests for rl_model_runner.infer
 */
import { describe, expect, test } from "bun:test";
import { infer } from "./infer";
import type { Observation } from "../strategic_planner";

function makeObservation(state: string): Observation {
  return {
    session: {
      sessionId: "c9d19e0d-4a61-4f09-87d5-aa2ec5d376b1",
      gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
      state: state as "Idle" | "Initialized" | "Probing" | "Playing" | "Evaluating" | "Completed",
      metrics: { totalSpins: 0, totalPayout: 0 },
    },
    metrics: { totalSpins: 0, totalPayout: 0 },
  };
}

describe("infer", () => {
  test("returns PlaceBet for Idle", () => {
    const obs = makeObservation("Idle");
    const action = infer(obs);
    expect(action.type).toBe("PlaceBet");
  });

  test("returns Spin for Playing", () => {
    const obs = makeObservation("Playing");
    const action = infer(obs);
    expect(action.type).toBe("Spin");
  });

  test("returns CashOut for Completed", () => {
    const obs = makeObservation("Completed");
    const action = infer(obs);
    expect(action.type).toBe("CashOut");
  });

  test("returns valid ActionProposal (exhaustive)", () => {
    const states = ["Idle", "Initialized", "Probing", "Playing", "Evaluating", "Completed"] as const;
    for (const s of states) {
      const obs = makeObservation(s);
      const action = infer(obs);
      expect(["PlaceBet", "Spin", "CashOut"]).toContain(action.type);
    }
  });
});
