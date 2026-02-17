/**
 * Unit tests for Observation layer (Stage 2).
 */
import { test, expect } from "bun:test";
import {
  fromSession,
  fromPlayActionResponse,
  type Observation,
} from "./observation";
import type { Session, GameplayResult, SessionMetrics } from "../ts-client";

const sampleMetrics: SessionMetrics = {
  totalSpins: 5,
  totalPayout: 12.5,
};

const sampleSession: Session = {
  sessionId: "c9d19e0d-4a61-4f09-87d5-aa2ec5d376b1",
  gameId: "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654",
  state: "Playing",
  metrics: sampleMetrics,
};

const sampleResult: GameplayResult = {
  payout: { amount: 10, currency: "AUD" },
  symbols: ["Cherry", "Bar", "Seven"],
};

test("fromSession builds Observation with session and metrics", () => {
  const obs = fromSession(sampleSession);
  expect(obs.session).toBe(sampleSession);
  expect(obs.metrics).toBe(sampleMetrics);
  expect(obs.result).toBeUndefined();
});

test("fromSession includes result when provided", () => {
  const obs = fromSession(sampleSession, sampleResult);
  expect(obs.result).toEqual(sampleResult);
  expect(obs.metrics).toBe(sampleSession.metrics);
});

test("fromSession treats null result as undefined", () => {
  const obs = fromSession(sampleSession, null);
  expect(obs.result).toBeUndefined();
});

test("fromPlayActionResponse builds Observation from response shape", () => {
  const response = { session: sampleSession, result: sampleResult };
  const obs = fromPlayActionResponse(response);
  expect(obs.session).toBe(sampleSession);
  expect(obs.result).toBe(sampleResult);
  expect(obs.metrics).toEqual(sampleMetrics);
});

test("Observation type has no any - session and metrics required", () => {
  const obs: Observation = {
    session: sampleSession,
    metrics: sampleMetrics,
  };
  expect(obs.session.state).toBe("Playing");
  expect(obs.metrics.totalSpins).toBe(5);
});
