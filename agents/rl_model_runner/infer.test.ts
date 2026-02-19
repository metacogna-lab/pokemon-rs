/**
 * Unit tests for rl_model_runner.infer — epsilon-greedy policy.
 */
import { describe, expect, test, spyOn } from "bun:test";
import { infer, decayEpsilon, initialPolicyState, type PolicyState } from "./infer";
import { plan } from "../strategic_planner";
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

describe("infer (epsilon=0 → exploit)", () => {
  const exploitPolicy: PolicyState = { epsilon: 0, episodeCount: 0, decayRate: 0.995 };

  test("returns PlaceBet for Idle when exploiting", () => {
    const obs = makeObservation("Idle");
    const action = infer(obs, exploitPolicy);
    expect(action.type).toBe("PlaceBet");
  });

  test("returns Spin for Playing when exploiting", () => {
    const obs = makeObservation("Playing");
    const action = infer(obs, exploitPolicy);
    expect(action.type).toBe("Spin");
  });

  test("returns CashOut for Completed when exploiting", () => {
    const obs = makeObservation("Completed");
    const action = infer(obs, exploitPolicy);
    expect(action.type).toBe("CashOut");
  });

  test("exploit action matches plan() output exactly", () => {
    const obs = makeObservation("Playing");
    const planned = plan(obs);
    const inferred = infer(obs, exploitPolicy);
    expect(inferred.type).toBe(planned.type);
  });
});

describe("infer (epsilon=1 → explore)", () => {
  const explorePolicy: PolicyState = { epsilon: 1.0, episodeCount: 0, decayRate: 0.995 };

  test("explore: action type is always valid", () => {
    const obs = makeObservation("Idle");
    const validTypes = ["PlaceBet", "Spin", "CashOut"];
    for (let i = 0; i < 20; i++) {
      const action = infer(obs, explorePolicy);
      expect(validTypes).toContain(action.type);
    }
  });

  test("PlaceBet action has amount with valid range", () => {
    // Force PlaceBet by mocking Math.random to return 0 (index 0 → PlaceBet)
    const originalRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      // First call: epsilon check (returns 0 → explore since 0 < 1.0)
      // Second call: action index (returns 0 → PlaceBet)
      // Third call: amount calculation
      const vals = [0, 0, 0.5];
      return vals[callCount++] ?? 0;
    };
    try {
      const obs = makeObservation("Idle");
      const action = infer(obs, explorePolicy);
      if (action.type === "PlaceBet") {
        expect(action.amount).toBeDefined();
        expect(action.amount!.amount).toBeGreaterThanOrEqual(0.5);
        expect(action.amount!.amount).toBeLessThanOrEqual(10.0);
        expect(action.amount!.currency).toBe("AUD");
      }
    } finally {
      Math.random = originalRandom;
    }
  });
});

describe("decayEpsilon", () => {
  test("reduces epsilon by decayRate", () => {
    const p = initialPolicyState(0.995);
    const p2 = decayEpsilon(p);
    expect(Math.abs(p2.epsilon - 0.995)).toBeLessThan(1e-9);
  });

  test("increments episodeCount", () => {
    const p = initialPolicyState();
    const p2 = decayEpsilon(p);
    expect(p2.episodeCount).toBe(1);
  });

  test("epsilon floors at 0.05", () => {
    // Start at just above floor
    let p: PolicyState = { epsilon: 0.051, episodeCount: 0, decayRate: 0.0 };
    p = decayEpsilon(p); // 0.051 * 0.0 = 0.0 → clamped to 0.05
    expect(p.epsilon).toBeCloseTo(0.05, 5);
  });

  test("epsilon never drops below 0.05 through many iterations", () => {
    let p = initialPolicyState(0.5); // aggressive decay
    for (let i = 0; i < 100; i++) {
      p = decayEpsilon(p);
    }
    expect(p.epsilon).toBeGreaterThanOrEqual(0.05);
  });

  test("decayRate 0.995 reaches near-floor after ~600 episodes", () => {
    let p = initialPolicyState(0.995);
    for (let i = 0; i < 600; i++) {
      p = decayEpsilon(p);
    }
    // After 600 iterations: 0.995^600 ≈ 0.049... which clamps to 0.05
    expect(p.epsilon).toBeCloseTo(0.05, 2);
  });
});

describe("initialPolicyState", () => {
  test("default starts at epsilon=1.0", () => {
    const p = initialPolicyState();
    expect(p.epsilon).toBe(1.0);
    expect(p.episodeCount).toBe(0);
  });

  test("custom decayRate is preserved", () => {
    const p = initialPolicyState(0.9);
    expect(p.decayRate).toBe(0.9);
  });
});
