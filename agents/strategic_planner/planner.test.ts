/**
 * Unit tests for planner and ActionProposal (Stage 3).
 */
import { test, expect } from "bun:test";
import { plan, toGameplayAction, type ActionProposal } from "./planner";
import { fromSession } from "./observation";
import type { Session, SessionMetrics } from "../ts-client";

const metrics: SessionMetrics = { totalSpins: 0, totalPayout: 0 };

function session(state: Session["state"]): Session {
  return {
    sessionId: "c9d19e0d-4a61-4f09-87d5-aa2ec5d376b1",
    gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
    state,
    metrics,
  };
}

test("plan returns PlaceBet for Initialized", () => {
  const obs = fromSession(session("Initialized"));
  const action = plan(obs);
  expect(action.type).toBe("PlaceBet");
});

test("plan returns PlaceBet for Idle", () => {
  const obs = fromSession(session("Idle"));
  const action = plan(obs);
  expect(action.type).toBe("PlaceBet");
});

test("plan returns Spin for Playing", () => {
  const obs = fromSession(session("Playing"));
  const action = plan(obs);
  expect(action.type).toBe("Spin");
});

test("plan returns Spin for Probing and Evaluating", () => {
  expect(plan(fromSession(session("Probing")))).toEqual({ type: "Spin" });
  expect(plan(fromSession(session("Evaluating")))).toEqual({ type: "Spin" });
});

test("plan returns CashOut for Completed", () => {
  const obs = fromSession(session("Completed"));
  const action = plan(obs);
  expect(action.type).toBe("CashOut");
});

test("ActionProposal PlaceBet can carry amount", () => {
  const proposal: ActionProposal = {
    type: "PlaceBet",
    amount: { amount: 5, currency: "AUD" },
  };
  expect(proposal.type).toBe("PlaceBet");
  expect(proposal.amount?.amount).toBe(5);
});

test("toGameplayAction maps all action types", () => {
  expect(toGameplayAction({ type: "PlaceBet", amount: { amount: 1, currency: "AUD" } })).toEqual({
    type: "PlaceBet",
    amount: { amount: 1, currency: "AUD" },
  });
  expect(toGameplayAction({ type: "Spin" })).toEqual({ type: "Spin" });
  expect(toGameplayAction({ type: "CashOut" })).toEqual({ type: "CashOut" });
});

test("exhaustive: plan handles every GameState", () => {
  const states: Session["state"][] = [
    "Idle",
    "Initialized",
    "Probing",
    "Playing",
    "Evaluating",
    "Completed",
  ];
  for (const state of states) {
    const obs = fromSession(session(state));
    const action = plan(obs);
    expect(["PlaceBet", "Spin", "CashOut"]).toContain(action.type);
  }
});
