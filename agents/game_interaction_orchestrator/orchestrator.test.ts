/**
 * Integration tests for orchestrator: mock API, retry, circuit breaker, WALLET_LIMIT_EXCEEDED.
 */
import { test, expect } from "bun:test";
import {
  runStep,
  orchestrate,
  CircuitBreaker,
  delay,
  type DefaultApi,
} from "./orchestrator";
import type { CreateSessionResponse, Session, PlayActionResponse } from "../ts-client";
import { ApiError } from "../ts-client";
import { Configuration, DefaultApi as DefaultApiClass } from "../ts-client";
import { getConservativeProfile } from "../strategic_planner/profiles";

const sessionId = "c9d19e0d-4a61-4f09-87d5-aa2ec5d376b1";
const gameId = "4f9b8e88-1f2a-4c34-8e2a-a7fe9ef7b654";

function makeSession(state: Session["state"]): Session {
  return {
    sessionId,
    gameId,
    state,
    metrics: { totalSpins: 0, totalPayout: 0 },
  };
}

test("CircuitBreaker records failures and opens after threshold", () => {
  const cb = new CircuitBreaker(3);
  expect(cb.isOpen()).toBe(false);
  cb.recordFailure();
  cb.recordFailure();
  expect(cb.isOpen()).toBe(false);
  cb.recordFailure();
  expect(cb.isOpen()).toBe(true);
  cb.recordSuccess();
  expect(cb.isOpen()).toBe(false);
});

test("runStep with mock API returns observation and done when Completed", async () => {
  let getCalls = 0;
  let playCalls = 0;
  const api: DefaultApi = {
    createSession: async () =>
      ({ sessionId, state: "Initialized" } as CreateSessionResponse),
    getSession: async () => {
      getCalls++;
      return makeSession(getCalls === 1 ? "Playing" : "Completed");
    },
    playAction: async () => {
      playCalls++;
      return {
        session: makeSession("Completed"),
        result: { payout: { amount: 5, currency: "AUD" }, symbols: [] },
      } as PlayActionResponse;
    },
  } as DefaultApi;
  const profile = getConservativeProfile();
  const result = await runStep(api, sessionId, profile, {
    delayMs: () => 0,
  });
  expect(result.observation.session.state).toBe("Completed");
  expect(result.done).toBe(true);
});

test("orchestrate creates session and runs until Completed", async () => {
  let createCalls = 0;
  let playCalls = 0;
  const api: DefaultApi = {
    createSession: async () => {
      createCalls++;
      return { sessionId, state: "Initialized" } as CreateSessionResponse;
    },
    getSession: async () => makeSession(playCalls === 0 ? "Initialized" : "Completed"),
    playAction: async () => {
      playCalls++;
      return {
        session: makeSession(playCalls >= 1 ? "Completed" : "Playing"),
        result: {},
      } as PlayActionResponse;
    },
  } as DefaultApi;
  const profile = getConservativeProfile();
  const observation = await orchestrate(
    api,
    { gameId, playerProfile: { behaviorType: "conservative" } },
    profile,
    { delayMs: () => 0 }
  );
  expect(observation.session.state).toBe("Completed");
  expect(createCalls).toBe(1);
});

test("WALLET_LIMIT_EXCEEDED is not retried", async () => {
  let attempts = 0;
  const api: DefaultApi = {
    createSession: async () => ({ sessionId, state: "Initialized" } as CreateSessionResponse),
    getSession: async () => makeSession("Playing"),
    playAction: async () => {
      attempts++;
      throw new ApiError("Daily limit exceeded", "WALLET_LIMIT_EXCEEDED", 402);
    },
  } as DefaultApi;
  const profile = getConservativeProfile();
  await expect(
    runStep(api, sessionId, profile, { maxRetries: 2, delayMs: () => 0 })
  ).rejects.toThrow(ApiError);
  expect(attempts).toBe(1);
});

test("delay resolves after ms", async () => {
  const start = Date.now();
  await delay(50);
  expect(Date.now() - start).toBeGreaterThanOrEqual(40);
});
